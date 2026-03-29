var K3Utils = {
  formatDate: function(date, format) {
    format = format || 'yyyy-MM-dd';
    if (!date) return '';
    
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    if (isNaN(date.getTime())) return '';
    
    var o = {
      'M+': date.getMonth() + 1,
      'd+': date.getDate(),
      'H+': date.getHours(),
      'm+': date.getMinutes(),
      's+': date.getSeconds(),
      'q+': Math.floor((date.getMonth() + 3) / 3),
      'S': date.getMilliseconds()
    };
    
    if (/(y+)/.test(format)) {
      format = format.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
    }
    
    for (var k in o) {
      if (new RegExp('(' + k + ')').test(format)) {
        format = format.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)));
      }
    }
    
    return format;
  },
  
  parseDate: function(str) {
    if (!str) return null;
    if (str instanceof Date) return str;
    
    var parts = str.split(/[-\/\s:]/);
    if (parts.length >= 3) {
      return new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10),
        parts.length > 3 ? parseInt(parts[3], 10) : 0,
        parts.length > 4 ? parseInt(parts[4], 10) : 0,
        parts.length > 5 ? parseInt(parts[5], 10) : 0
      );
    }
    return null;
  },
  
  formatNumber: function(num, decimals) {
    decimals = decimals || 2;
    if (num === null || num === undefined || isNaN(num)) return '';
    
    var parts = parseFloat(num).toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  },
  
  parseNumber: function(str) {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    return parseFloat(str.replace(/,/g, '')) || 0;
  },
  
  escapeHtml: function(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  
  trim: function(str) {
    if (!str) return '';
    return String(str).replace(/^\s+|\s+$/g, '');
  },
  
  isEmpty: function(val) {
    return val === null || val === undefined || val === '';
  },
  
  generateId: function() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },
  
  hashPassword: function(password) {
    var crypto = require('crypto');
    return crypto.createHash('sha256').update(password + 'k3_salt').digest('hex');
  },
  
  showMessage: function(msg, type) {
    type = type || 'info';
    alert(msg);
  },
  
  confirm: function(msg) {
    return window.confirm(msg);
  },
  
  debounce: function(fn, delay) {
    var timer = null;
    return function() {
      var context = this;
      var args = arguments;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function() {
        fn.apply(context, args);
      }, delay);
    };
  },
  
  extend: function(target, source) {
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    }
    return target;
  },
  
  getPeriod: function(date) {
    date = date || new Date();
    return this.formatDate(date, 'yyyy-MM');
  },
  
  getVoucherNo: function(date, seq) {
    date = date || new Date();
    seq = seq || 1;
    var prefix = this.formatDate(date, 'yyyyMM');
    return prefix + String(seq).padStart(4, '0');
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = K3Utils;
}
