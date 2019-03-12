/**
 * Created by Alex.Taylor on 26/02/2016.
 */

// use strict


// require dependencies
const Bot    = require('slackbots');
const config = require('config');
const Daemon = require('daemon');

/**
 * build example dameon class
 *
 * @cluster slack
 * @cluster back
 */
class SlackDaemon extends Daemon {
  /**
   * construct rentlar daemon class
   */
  constructor() {
    // run super eden
    super();

    // bind methods
    this.build = this.build.bind(this);

    // bind private methods
    this.postUser = this.postUser.bind(this);
    this.postCreate = this.postCreate.bind(this);
    this.postChannel = this.postChannel.bind(this);

    // run build method
    this.build();
  }

  /**
   * builds rentlar slack daemon
   */
  async build() {
    // load bot
    this.__bot = new Bot({
      name  : config.get('slack.bot.name'),
      token : config.get('slack.bot.token'),
    });

    // bind eden listeners
    this.eden.endpoint('slack.post', this.postCreate, true);
    this.eden.endpoint('slack.user', this.postUser, true);
    this.eden.endpoint('slack.channel', this.postChannel, true);
  }

  /**
   * post message to id
   *
   * @param {Array|null} data
   *
   * @private
   */
  postCreate(data) {
    // apply to method
    return this.__bot.postMessage(...data);
  }

  /**
   * posts message to user
   *
   * @param {Array|null} data
   *
   * @private
   */
  postUser(data) {
    // apply to method
    return this.__bot.postMessageToUser(...data);
  }

  /**
   * posts message to channel
   *
   * @param {Array|null} data
   *
   * @private
   */
  postChannel(data) {
    // apply to method
    return this.__bot.postMessageToChannel(...data);
  }
}

/**
 * export slack daemon class
 *
 * @type {SlackDaemon}
 */
module.exports = SlackDaemon;
