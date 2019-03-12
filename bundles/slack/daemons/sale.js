
// require dependencies
const Daemon = require('daemon');

// require helpers
const SlackHelper = helper('slack');

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

    // run build method
    this.build();
  }

  /**
   * builds rentlar slack daemon
   */
  async build() {
    // build sale daemon
  }
}

/**
 * export slack daemon class
 *
 * @type {SlackSaleDaemon}
 */
module.exports = SlackSaleDaemon;
