
// require dependencies
const config    = require('config');
const Daemon    = require('daemon');
const schedule  = require('node-schedule');
const formatter = require('currency-formatter');

// require helpers
const slackHelper = helper('slack');
const orderHelper = helper('order');

// rquire models
const Payment = model('payment');

/**
 * build example dameon class
 */
class SlackSaleDaemon extends Daemon {
  /**
   * construct rentlar daemon class
   */
  constructor() {
    // run super eden
    super();

    // bind methods
    this.build = this.build.bind(this);
    this.sendOrder = this.sendOrder.bind(this);
    this.sendStats = this.sendStats.bind(this);

    // run build method
    this.building = this.build();
  }

  /**
   * builds rentlar slack daemon
   */
  async build() {
    // build sale daemon
    this.eden.post('order.complete', this.sendOrder);

    // build sale daemon
    this.eden.on('subscription.started', subscription => this.sendSubscription(subscription, 'Started', '#28a745'));
    this.eden.on('subscription.cancelled', subscription => this.sendSubscription(subscription, 'Cancelled', '#dc3545'));
    this.eden.on('subscription.requested', subscription => this.sendSubscription(subscription, 'Cancel Requested', '#ffc107'));

    // check thread
    if (['back', 'stats'].includes(this.eden.cluster) && parseInt(this.eden.id) === 0) {
      // send stats
      schedule.scheduleJob({
        hour   : 9,
        minute : 0,
      }, this.sendStats);
    }
  }

  /**
   * sends order
   *
   * @param  {Order}  order
   *
   * @return {Promise}
   */
  async sendOrder(order) {
    // return no token
    if (!config.get('slack.bot.token')) return;

    // try/catch
    try {
      // get models
      const user      = await order.get('user');
      const invoice   = await order.get('invoice');
      const payment   = await Payment.where('invoice.id', invoice.get('_id').toString()).findOne();
      const affiliate = await order.get('affiliate');

      // set initial fields
      const fields = [{
        title : 'When',
        value : order.get('created_at').toLocaleString(),
      }];

      // check affiliate
      if (affiliate) {
        // set user
        let aff = await affiliate.get('user');
        aff = Array.isArray(aff) ? aff[0] : aff;

        // push affilate
        if (aff) {
          // push to fields
          fields.push({
            title : 'Affiliate',
            value : `${aff.name() || aff.get('username') || aff.get('email')}`,
          });
        }
      }

      fields.push(...([{
        title : 'Name',
        value : user ? `${user.name() || user.get('username') || user.get('email')}` : order.get('address.name'),
      }, {
        title : 'Amount',
        value : `${formatter.format((invoice.get('total') || 0), {
          code : invoice.get('currency') || config.get('shop.currency') || 'USD',
        })} ${order.get('currency') || config.get('shop.currency') || 'USD'}`,
      }, {
        title : 'Method',
        value : payment ? payment.get('method.type') : 'N/A',
      }, {
        title : 'Discount',
        value : `${formatter.format((invoice.get('discount') || 0), {
          code : invoice.get('currency') || config.get('shop.currency') || 'USD',
        })} ${order.get('currency') || config.get('shop.currency') || 'USD'}`,
      }]));

      // push line items
      fields.push({
        title : 'Items',
        short : true,
        value : (await Promise.all((await orderHelper.lines(order)).map(async (line) => {
          // return value
          return `$${line.price.toFixed(2)} ${invoice.get('currency')} • ${line.qty.toLocaleString()} X ${line.title} (${line.sku})`;
        }))).join('\n\n'),
      });

      // create data object
      const data = {
        as_user     : true,
        attachments : [{
          fields,
          color      : '#28a745',
          title      : 'Order Completed',
          title_link : `https://${config.get('domain')}/admin/shop/order/${order.get('_id').toString()}/update`,
        }],
      };

      // hook
      await this.eden.hook('sales.slack', data, order);

      // send to channel
      slackHelper.channel(config.get('slack.sales.channel'), 'Order Completed', data);
    } catch (e) {
      // log error
      console.log(e);
    }
  }

  /**
   * sends subscription
   *
   * @param  {Subscription}  subscription
   * @param  {String}        type
   * @param  {String}        color
   *
   * @return {Promise}
   */
  async sendSubscription(subscription, type, color) {
    // return no token
    if (!config.get('slack.bot.token') || !subscription) return;

    // try/catch
    try {
      // get models
      const user    = await subscription.get('user');
      const order   = await subscription.get('order');
      const payment = await subscription.get('payment');
      const product = await subscription.get('product');
      const invoice = await order.get('invoice');

      // set initial fields
      const fields = [{
        title : 'Name',
        value : user ? user.name() : 'N/A',
      }, {
        title : 'Subscription',
        value : product ? Object.values(product.get('title'))[0] : 'N/A',
      }, {
        title : 'Method',
        value : payment ? payment.get('method.type') : 'N/A',
      }, {
        name  : 'Price',
        value : subscription.get('price') ? `${formatter.format(subscription.get('price'), {
          code : invoice.get('currency') || config.get('shop.currency') || 'USD',
        })} ${order.get('currency') || config.get('shop.currency') || 'USD'}` : 'N/A',
      }, {
        title : 'State',
        value : subscription.get('state'),
      }, {
        title : 'Started',
        value : (subscription.get('started_at') || subscription.get('created_at')).toLocaleString(),
        short : true,
      }, {
        title : 'Due',
        value : subscription.get('due').toLocaleString(),
        short : true,
      }];

      // create data object
      const data = {
        as_user     : true,
        attachments : [{
          color,
          fields,
          title      : `Subscription ${type}`,
          title_link : `https://${config.get('domain')}/admin/shop/subscription/${subscription.get('_id').toString()}/update`,
        }],
      };

      // hook
      await this.eden.hook('sales.slack.subscription', data, subscription);

      // send to channel
      slackHelper.channel(config.get('slack.sales.channel') || config.get('slack.subscription.channel'), `Subscription ${type}`, data);
    } catch (e) {
      // log error
      console.log(e);
    }
  }

  /**
   * sends subscription
   *
   * @param  {Subscription}  subscription
   * @param  {String}        type
   * @param  {String}        color
   *
   * @return {Promise}
   */
  async sendStats() {
    // return no token
    if (!config.get('slack.bot.token')) return;

    // create stats object
    const stats       = {};
    const attachments = [];

    // await hook
    await this.eden.hook('shop.stats.send', stats);

    // loop stats
    for (const stat in stats) {
      // set fields
      const fields = [];

      // loop keys in count
      for (const key in stats[stat].count) { // eslint-disable-guard-for-in
        // set value
        const count = stats[stat].count[key];
        const money = (stats[stat].money || {})[key];

        // create field
        fields.push({
          title : `${key}`,
          value : `${stats[stat].count[key].toLocaleString()}${money ? ` ${formatter.format(money, {
            code : config.get('shop.currency') || 'USD',
          })}` : ''}`,
          short : true,
        });
      }

      // set data
      attachments.push({
        fields,
        color : '#28a745',
        title : stats[stat].title,
      });
    }

    // create post
    const data = {
      attachments,
      as_user : true,
    };

    // send to channel
    slackHelper.channel(config.get('slack.stats.channel') || config.get('slack.sales.channel'), 'Shop Statistics', data);
  }
}

/**
 * export slack daemon class
 *
 * @type {SlackSaleDaemon}
 */
module.exports = SlackSaleDaemon;
