var K3Router = {
  routes: {},
  currentRoute: null,
  
  register: function(path, config) {
    this.routes[path] = config;
  },
  
  navigate: function(path, params) {
    params = params || {};
    
    if (!this.routes[path]) {
      console.error('Route not found:', path);
      return;
    }
    
    this.currentRoute = {
      path: path,
      params: params,
      config: this.routes[path]
    };
    
    this.render();
    this.updateBreadcrumb();
  },
  
  render: function() {
    if (!this.currentRoute) return;
    
    var config = this.currentRoute.config;
    var container = document.getElementById('main-content');
    
    if (!container) return;
    
    if (config.template) {
      container.innerHTML = config.template;
    }
    
    if (config.controller) {
      config.controller(this.currentRoute.params);
    }
  },
  
  updateBreadcrumb: function() {
    if (!this.currentRoute) return;
    
    var breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) return;
    
    var parts = this.currentRoute.path.split('/');
    var crumbs = ['首页'];
    
    if (parts.length > 1) {
      crumbs.push(this.currentRoute.config.title || parts[1]);
    }
    
    if (parts.length > 2) {
      crumbs.push(this.currentRoute.config.subtitle || parts[2]);
    }
    
    breadcrumb.innerHTML = crumbs.join(' &raquo; ');
  },
  
  getCurrentRoute: function() {
    return this.currentRoute;
  }
};

K3Router.register('dashboard', {
  title: '首页',
  template: '<div class="dashboard"><h2>欢迎使用金蝶财务软件 K3</h2><p>请从左侧菜单选择功能模块。</p></div>',
  controller: function() {
    console.log('Dashboard loaded');
  }
});

K3Router.register('base/account', {
  title: '基础资料',
  subtitle: '会计科目',
  template: '<div id="account-list"></div>',
  controller: function() {
    AccountModule.init();
  }
});

K3Router.register('base/department', {
  title: '基础资料',
  subtitle: '部门',
  template: '<div id="department-list"></div>',
  controller: function() {
    DepartmentModule.init();
  }
});

K3Router.register('base/customer', {
  title: '基础资料',
  subtitle: '客户',
  template: '<div id="customer-list"></div>',
  controller: function() {
    CustomerModule.init();
  }
});

K3Router.register('base/supplier', {
  title: '基础资料',
  subtitle: '供应商',
  template: '<div id="supplier-list"></div>',
  controller: function() {
    SupplierModule.init();
  }
});

K3Router.register('gl/voucher', {
  title: '总账',
  subtitle: '凭证录入',
  template: '<div id="voucher-list"></div>',
  controller: function() {
    VoucherModule.init();
  }
});

K3Router.register('gl/ledger', {
  title: '总账',
  subtitle: '总账查询',
  template: '<div id="ledger-query"></div>',
  controller: function() {
    LedgerModule.init();
  }
});

K3Router.register('report/balance', {
  title: '报表',
  subtitle: '资产负债表',
  template: '<div id="balance-report"></div>',
  controller: function() {
    BalanceReportModule.init();
  }
});

K3Router.register('report/income', {
  title: '报表',
  subtitle: '利润表',
  template: '<div id="income-report"></div>',
  controller: function() {
    IncomeReportModule.init();
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = K3Router;
}
