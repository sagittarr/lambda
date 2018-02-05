var qcloud = require('../vendor/wafer2-client-sdk/index')
var config = require('../config')
var util = require('../utils/util.js')

class TunnelConnection {
  static instance = undefined;
  static getInstance(){
    if (TunnelConnection.instance == undefined){
      TunnelConnection.instance = new TunnelConnection();
    }
    return TunnelConnection.instance;
  }
    tunnelStatus = undefined;
    tunnel = undefined;
    openTunnel() {
    util.showBusy('信道连接中...')
    // 创建信道，需要给定后台服务地址
    var tunnel = this.tunnel = new qcloud.Tunnel(config.service.tunnelUrl)

    // 监听信道内置消息，包括 connect/close/reconnecting/reconnect/error
    tunnel.on('connect', () => {
      util.showSuccess('信道已连接')
      console.log('WebSocket 信道已连接')
      this.tunnelStatus='connected';
    })

    tunnel.on('close', () => {
      util.showSuccess('信道已断开')
      console.log('WebSocket 信道已断开')
      this.tunnelStatus ='closed'
    })

    tunnel.on('reconnecting', () => {
      console.log('WebSocket 信道正在重连...')
      util.showBusy('正在重连')
    })

    tunnel.on('reconnect', () => {
      console.log('WebSocket 信道重连成功')
      util.showSuccess('重连成功')
    })

    tunnel.on('error', error => {
      util.showModel('信道发生错误', error)
      console.error('信道发生错误：', error)
    })

    // 监听自定义消息（服务器进行推送）
    // tunnel.on('speak', speak => {
    //   util.showModel('信道消息', speak)
    //   console.log('收到说话消息：', speak)
    // })

    // 打开信道
    tunnel.open()

    this.tunnelStatus ='connecting' 
  };

  /**
   * 点击「发送消息」按钮，测试使用信道发送消息
   */
  sendMessage(ticker, isBenchMark, startDate, endDate, pid) {
    if (!this.tunnelStatus || !this.tunnelStatus === 'connected') return
    // 使用 tunnel.isActive() 来检测当前信道是否处于可用状态
    if (this.tunnel && this.tunnel.isActive()) {
      // 使用信道给服务器推送「speak」消息
      this.tunnel.emit('speak', {
        'ticker': ticker,
        'isBenchMark': isBenchMark,
        'startDate': startDate,
        'endDate': endDate,
        'pid': pid
        // 'word': 'I say something at ' + new Date(),
      });
    }
  };
  sendMessage(packet) {
    if (!this.tunnelStatus || !this.tunnelStatus === 'connected') return
    // 使用 tunnel.isActive() 来检测当前信道是否处于可用状态
    if (this.tunnel && this.tunnel.isActive()) {
      // 使用信道给服务器推送「speak」消息
      this.tunnel.emit('speak', packet);
    }
  };
  /**
   * 点击「关闭信道」按钮，关闭已经打开的信道
   */
   closeTunnel() {
    if (this.tunnel) {
      this.tunnel.close();
    }
    util.showBusy('信道连接中...')
    this.tunnelStatus ='closed'
  }

};

module.exports.Connection = TunnelConnection;