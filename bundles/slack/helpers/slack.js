
// Require dependencies
const Helper = require('helper');

/**
 * Build slack helper class
 */
class SlackHelper extends Helper {
  /**
   * Construct slack helper
   */
  constructor() {
    // run super
    super();

    // bind methods
    this.user = this.user.bind(this);
    this.channel = this.channel.bind(this);
    this.message = this.message.bind(this);
  }

  /**
   * post message to anywhere
   */
  post(...args) {
    // emit to eden
    return this.eden.call('slack.post', Array.from(args), true);
  }

  /**
   * post message to user
   */
  user(...args) {
    // emit to eden
    return this.eden.call('slack.user', Array.from(args), true);
  }

  /**
   * post message to user
   */
  channel(...args) {
    // emit to eden
    return this.eden.call('slack.channel', Array.from(args), true);
  }
}

/**
 * export slack class
 *
 * @type {slack}
 */
module.exports = new SlackHelper();
