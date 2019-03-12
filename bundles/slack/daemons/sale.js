
// require dependencies
const config = require('config');
const Daemon = require('daemon');

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

    // run build method
    this.building = this.build();
  }

  /**
   * builds rentlar slack daemon
   */
  async build() {
    // build sale daemon
    this.eden.post('order.complete', this.sendOrder);
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
      const user    = await order.get('user');
      const invoice = await order.get('invoice');
      const payment = await Payment.where('invoice.id', invoice.get('_id').toString()).findOne();

      // set initial fields
      const fields = [{
        title : 'When',
        value : order.get('created_at').toLocaleString(),
      }, {
        title : 'Name',
        value : user.get('email') || user.get('username'),
      }, {
        title : 'Amount',
        value : `$${invoice.get('total').toFixed(2)} USD`,
      }, {
        title : 'Method',
        value : payment ? payment.get('method.type') : 'N/A',
      }, {
        title : 'Discount',
        value : `$${(invoice.get('discount') || 0).toFixed(2)} USD`,
      }];

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
}

/**
 * export slack daemon class
 *
 * @type {SlackSaleDaemon}
 */
module.exports = SlackSaleDaemon;
