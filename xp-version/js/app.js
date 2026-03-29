var K3App = {
  currentUser: null,
  currentAccountBook: null,
  
  init: function() {
    var self = this;
    
    console.log('K3 App initializing...');
    
    if (typeof initSqlJs !== 'undefined') {
      initSqlJs({
        locateFile: function(file) {
          return 'lib/' + file;
        }
      }).then(function(SQL) {
        K3Database.init(SQL);
        self.setupUI();
        self.bindEvents();
        self.loadAccountBooks();
      }).catch(function(err) {
        console.error('Failed to init sql.js:', err);
        alert('数据库初始化失败: ' + err.message);
      });
    } else {
      console.error('sql.js not loaded');
      alert('数据库组件未加载');
    }
  },
  
  setupUI: function() {
    document.getElementById('current-date').textContent = K3Utils.formatDate(new Date(), 'yyyy年MM月dd日');
    this.buildMenu();
  },
  
  buildMenu: function() {
    var menuData = [
      {
        name: '基础资料',
        icon: 'folder',
        children: [
          { name: '会计科目', path: 'base/account' },
          { name: '部门', path: 'base/department' },
          { name: '客户', path: 'base/customer' },
          { name: '供应商', path: 'base/supplier' }
        ]
      },
      {
        name: '总账',
        icon: 'book',
        children: [
          { name: '凭证录入', path: 'gl/voucher' },
          { name: '总账查询', path: 'gl/ledger' }
        ]
      },
      {
        name: '报表',
        icon: 'chart',
        children: [
          { name: '资产负债表', path: 'report/balance' },
          { name: '利润表', path: 'report/income' }
        ]
      }
    ];
    
    var navMenu = document.getElementById('nav-menu');
    if (!navMenu) return;
    
    var html = '';
    menuData.forEach(function(item) {
      html += '<li>';
      html += '<a href="javascript:void(0)">' + item.name + '</a>';
      html += '<ul class="sub-menu">';
      item.children.forEach(function(child) {
        html += '<li><a href="javascript:void(0)" data-path="' + child.path + '">' + child.name + '</a></li>';
      });
      html += '</ul>';
      html += '</li>';
    });
    
    navMenu.innerHTML = html;
  },
  
  bindEvents: function() {
    var self = this;
    
    document.getElementById('login-form').addEventListener('submit', function(e) {
      e.preventDefault();
      self.login();
    });
    
    document.getElementById('btn-logout').addEventListener('click', function() {
      self.logout();
    });
    
    document.getElementById('nav-menu').addEventListener('click', function(e) {
      var target = e.target;
      var path = target.getAttribute('data-path');
      
      if (path) {
        var parentLi = target.closest('li');
        var subMenu = target.closest('.sub-menu');
        var parentMenu = subMenu ? subMenu.parentElement : null;
        
        document.querySelectorAll('.nav-menu > li').forEach(function(li) {
          li.classList.remove('active');
        });
        document.querySelectorAll('.sub-menu li').forEach(function(li) {
          li.classList.remove('active');
        });
        
        if (parentMenu) {
          parentMenu.classList.add('active');
        }
        if (parentLi) {
          parentLi.classList.add('active');
        }
        
        K3Router.navigate(path);
      }
    });
  },
  
  loadAccountBooks: function() {
    var books = K3Database.query('SELECT * FROM sys_account_book ORDER BY created_at DESC');
    var select = document.getElementById('account-book');
    
    if (select && books.length > 0) {
      var html = '<option value="">-- 请选择账套 --</option>';
      books.forEach(function(book) {
        html += '<option value="' + book.id + '">' + book.name + '</option>';
      });
      select.innerHTML = html;
    }
  },
  
  login: function() {
    var username = K3Utils.trim(document.getElementById('username').value);
    var password = document.getElementById('password').value;
    var accountBookId = document.getElementById('account-book').value;
    
    if (!username) {
      alert('请输入用户名');
      return;
    }
    
    var user = K3Database.queryOne(
      'SELECT * FROM sys_user WHERE username = ?',
      [username]
    );
    
    if (!user) {
      alert('用户名不存在');
      return;
    }
    
    var hashedPassword = K3Utils.hashPassword(password);
    if (user.password !== hashedPassword) {
      alert('密码错误');
      return;
    }
    
    this.currentUser = user;
    
    if (accountBookId) {
      this.currentAccountBook = K3Database.queryOne(
        'SELECT * FROM sys_account_book WHERE id = ?',
        [accountBookId]
      );
    }
    
    document.getElementById('current-user').textContent = user.real_name || user.username;
    if (this.currentAccountBook) {
      document.getElementById('company-name').textContent = this.currentAccountBook.company_name || this.currentAccountBook.name;
    }
    
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');
    
    K3Router.navigate('dashboard');
    
    K3Database.execute(
      'INSERT INTO sys_operation_log (user_id, operation, module) VALUES (?, ?, ?)',
      [user.id, '登录', '系统']
    );
  },
  
  logout: function() {
    if (!K3Utils.confirm('确定要退出系统吗？')) return;
    
    if (this.currentUser) {
      K3Database.execute(
        'INSERT INTO sys_operation_log (user_id, operation, module) VALUES (?, ?, ?)',
        [this.currentUser.id, '退出', '系统']
      );
    }
    
    this.currentUser = null;
    this.currentAccountBook = null;
    
    document.getElementById('password').value = '';
    document.getElementById('main-screen').classList.remove('active');
    document.getElementById('login-screen').classList.add('active');
  }
};

var AccountModule = {
  init: function() {
    var container = document.getElementById('account-list');
    if (!container) return;
    
    var html = '<div class="toolbar">';
    html += '<button class="btn btn-primary" onclick="AccountModule.add()">新增</button>';
    html += '<button class="btn" onclick="AccountModule.refresh()">刷新</button>';
    html += '</div>';
    
    html += '<div class="search-box">';
    html += '<label>科目编码: <input type="text" id="search-code" style="width:100px"></label>';
    html += '<label>科目名称: <input type="text" id="search-name" style="width:150px"></label>';
    html += '<button class="btn" onclick="AccountModule.search()">查询</button>';
    html += '</div>';
    
    html += '<div class="data-grid"><table>';
    html += '<thead><tr><th>编码</th><th>名称</th><th>类别</th><th>方向</th><th>状态</th><th>操作</th></tr></thead>';
    html += '<tbody id="account-tbody"></tbody>';
    html += '</table></div>';
    
    container.innerHTML = html;
    this.load();
  },
  
  load: function() {
    var tbody = document.getElementById('account-tbody');
    if (!tbody) return;
    
    var accounts = K3Database.query('SELECT * FROM base_account ORDER BY code');
    
    var html = '';
    accounts.forEach(function(acc) {
      html += '<tr>';
      html += '<td>' + K3Utils.escapeHtml(acc.code) + '</td>';
      html += '<td>' + K3Utils.escapeHtml(acc.name) + '</td>';
      html += '<td>' + K3Utils.escapeHtml(acc.category || '') + '</td>';
      html += '<td>' + K3Utils.escapeHtml(acc.direction || '') + '</td>';
      html += '<td>' + (acc.is_enabled ? '启用' : '停用') + '</td>';
      html += '<td class="actions">';
      html += '<a href="javascript:void(0)" onclick="AccountModule.edit(' + acc.id + ')">编辑</a>';
      html += '<a href="javascript:void(0)" onclick="AccountModule.delete(' + acc.id + ')">删除</a>';
      html += '</td>';
      html += '</tr>';
    });
    
    tbody.innerHTML = html || '<tr><td colspan="6" class="empty">暂无数据</td></tr>';
  },
  
  add: function() {
    this.showForm(null);
  },
  
  edit: function(id) {
    this.showForm(id);
  },
  
  showForm: function(id) {
    var account = id ? K3Database.queryOne('SELECT * FROM base_account WHERE id = ?', [id]) : null;
    var title = account ? '编辑科目' : '新增科目';
    
    var html = '<div class="modal-overlay" id="account-modal">';
    html += '<div class="modal" style="width:400px;">';
    html += '<div class="modal-header">' + title + '<button class="close" onclick="AccountModule.closeForm()">&times;</button></div>';
    html += '<div class="modal-body">';
    html += '<form id="account-form">';
    html += '<input type="hidden" id="account-id" value="' + (account ? account.id : '') + '">';
    html += '<div class="form-row"><label>编码:</label><div class="form-control"><input type="text" id="account-code" value="' + (account ? K3Utils.escapeHtml(account.code) : '') + '" required></div></div>';
    html += '<div class="form-row"><label>名称:</label><div class="form-control"><input type="text" id="account-name" value="' + (account ? K3Utils.escapeHtml(account.name) : '') + '" required></div></div>';
    html += '<div class="form-row"><label>类别:</label><div class="form-control"><select id="account-category">';
    html += '<option value="资产"' + (account && account.category === '资产' ? ' selected' : '') + '>资产</option>';
    html += '<option value="负债"' + (account && account.category === '负债' ? ' selected' : '') + '>负债</option>';
    html += '<option value="权益"' + (account && account.category === '权益' ? ' selected' : '') + '>权益</option>';
    html += '<option value="成本"' + (account && account.category === '成本' ? ' selected' : '') + '>成本</option>';
    html += '<option value="损益"' + (account && account.category === '损益' ? ' selected' : '') + '>损益</option>';
    html += '</select></div></div>';
    html += '<div class="form-row"><label>方向:</label><div class="form-control"><select id="account-direction">';
    html += '<option value="借"' + (account && account.direction === '借' ? ' selected' : '') + '>借</option>';
    html += '<option value="贷"' + (account && account.direction === '贷' ? ' selected' : '') + '>贷</option>';
    html += '</select></div></div>';
    html += '</form></div>';
    html += '<div class="modal-footer"><button class="btn" onclick="AccountModule.closeForm()">取消</button><button class="btn btn-primary" onclick="AccountModule.save()">保存</button></div>';
    html += '</div></div>';
    
    document.body.insertAdjacentHTML('beforeend', html);
  },
  
  closeForm: function() {
    var modal = document.getElementById('account-modal');
    if (modal) modal.remove();
  },
  
  save: function() {
    var id = document.getElementById('account-id').value;
    var code = K3Utils.trim(document.getElementById('account-code').value);
    var name = K3Utils.trim(document.getElementById('account-name').value);
    var category = document.getElementById('account-category').value;
    var direction = document.getElementById('account-direction').value;
    
    if (!code || !name) {
      alert('请填写完整信息');
      return;
    }
    
    var sql, params;
    if (id) {
      sql = 'UPDATE base_account SET code=?, name=?, category=?, direction=? WHERE id=?';
      params = [code, name, category, direction, id];
    } else {
      sql = 'INSERT INTO base_account (code, name, category, direction, level) VALUES (?, ?, ?, ?, 1)';
      params = [code, name, category, direction];
    }
    
    var result = K3Database.execute(sql, params);
    if (result.error) {
      alert('保存失败: ' + result.error);
    } else {
      this.closeForm();
      this.load();
    }
  },
  
  delete: function(id) {
    if (!K3Utils.confirm('确定要删除此科目吗？')) return;
    
    K3Database.execute('DELETE FROM base_account WHERE id = ?', [id]);
    this.load();
  },
  
  search: function() {
    var code = K3Utils.trim(document.getElementById('search-code').value);
    var name = K3Utils.trim(document.getElementById('search-name').value);
    
    var sql = 'SELECT * FROM base_account WHERE 1=1';
    var params = [];
    
    if (code) {
      sql += ' AND code LIKE ?';
      params.push('%' + code + '%');
    }
    if (name) {
      sql += ' AND name LIKE ?';
      params.push('%' + name + '%');
    }
    sql += ' ORDER BY code';
    
    var tbody = document.getElementById('account-tbody');
    var accounts = K3Database.query(sql, params);
    
    var html = '';
    accounts.forEach(function(acc) {
      html += '<tr>';
      html += '<td>' + K3Utils.escapeHtml(acc.code) + '</td>';
      html += '<td>' + K3Utils.escapeHtml(acc.name) + '</td>';
      html += '<td>' + K3Utils.escapeHtml(acc.category || '') + '</td>';
      html += '<td>' + K3Utils.escapeHtml(acc.direction || '') + '</td>';
      html += '<td>' + (acc.is_enabled ? '启用' : '停用') + '</td>';
      html += '<td class="actions">';
      html += '<a href="javascript:void(0)" onclick="AccountModule.edit(' + acc.id + ')">编辑</a>';
      html += '<a href="javascript:void(0)" onclick="AccountModule.delete(' + acc.id + ')">删除</a>';
      html += '</td>';
      html += '</tr>';
    });
    
    tbody.innerHTML = html || '<tr><td colspan="6" class="empty">暂无数据</td></tr>';
  },
  
  refresh: function() {
    document.getElementById('search-code').value = '';
    document.getElementById('search-name').value = '';
    this.load();
  }
};

var DepartmentModule = {
  init: function() {
    var container = document.getElementById('department-list');
    if (!container) return;
    
    var html = '<div class="toolbar">';
    html += '<button class="btn btn-primary" onclick="DepartmentModule.add()">新增</button>';
    html += '<button class="btn" onclick="DepartmentModule.refresh()">刷新</button>';
    html += '</div>';
    html += '<div class="data-grid"><table>';
    html += '<thead><tr><th>编码</th><th>名称</th><th>状态</th><th>操作</th></tr></thead>';
    html += '<tbody id="department-tbody"></tbody>';
    html += '</table></div>';
    
    container.innerHTML = html;
    this.load();
  },
  
  load: function() {
    var tbody = document.getElementById('department-tbody');
    if (!tbody) return;
    
    var items = K3Database.query('SELECT * FROM base_department ORDER BY code');
    
    var html = '';
    items.forEach(function(item) {
      html += '<tr>';
      html += '<td>' + K3Utils.escapeHtml(item.code) + '</td>';
      html += '<td>' + K3Utils.escapeHtml(item.name) + '</td>';
      html += '<td>' + (item.is_enabled ? '启用' : '停用') + '</td>';
      html += '<td class="actions">';
      html += '<a href="javascript:void(0)" onclick="DepartmentModule.edit(' + item.id + ')">编辑</a>';
      html += '<a href="javascript:void(0)" onclick="DepartmentModule.delete(' + item.id + ')">删除</a>';
      html += '</td>';
      html += '</tr>';
    });
    
    tbody.innerHTML = html || '<tr><td colspan="4" class="empty">暂无数据</td></tr>';
  },
  
  add: function() {
    this.showForm(null);
  },
  
  edit: function(id) {
    this.showForm(id);
  },
  
  showForm: function(id) {
    var item = id ? K3Database.queryOne('SELECT * FROM base_department WHERE id = ?', [id]) : null;
    var title = item ? '编辑部门' : '新增部门';
    
    var html = '<div class="modal-overlay" id="department-modal">';
    html += '<div class="modal" style="width:350px;">';
    html += '<div class="modal-header">' + title + '<button class="close" onclick="DepartmentModule.closeForm()">&times;</button></div>';
    html += '<div class="modal-body">';
    html += '<form id="department-form">';
    html += '<input type="hidden" id="dept-id" value="' + (item ? item.id : '') + '">';
    html += '<div class="form-row"><label>编码:</label><div class="form-control"><input type="text" id="dept-code" value="' + (item ? K3Utils.escapeHtml(item.code) : '') + '" required></div></div>';
    html += '<div class="form-row"><label>名称:</label><div class="form-control"><input type="text" id="dept-name" value="' + (item ? K3Utils.escapeHtml(item.name) : '') + '" required></div></div>';
    html += '</form></div>';
    html += '<div class="modal-footer"><button class="btn" onclick="DepartmentModule.closeForm()">取消</button><button class="btn btn-primary" onclick="DepartmentModule.save()">保存</button></div>';
    html += '</div></div>';
    
    document.body.insertAdjacentHTML('beforeend', html);
  },
  
  closeForm: function() {
    var modal = document.getElementById('department-modal');
    if (modal) modal.remove();
  },
  
  save: function() {
    var id = document.getElementById('dept-id').value;
    var code = K3Utils.trim(document.getElementById('dept-code').value);
    var name = K3Utils.trim(document.getElementById('dept-name').value);
    
    if (!code || !name) {
      alert('请填写完整信息');
      return;
    }
    
    var sql, params;
    if (id) {
      sql = 'UPDATE base_department SET code=?, name=? WHERE id=?';
      params = [code, name, id];
    } else {
      sql = 'INSERT INTO base_department (code, name) VALUES (?, ?)';
      params = [code, name];
    }
    
    var result = K3Database.execute(sql, params);
    if (result.error) {
      alert('保存失败: ' + result.error);
    } else {
      this.closeForm();
      this.load();
    }
  },
  
  delete: function(id) {
    if (!K3Utils.confirm('确定要删除此部门吗？')) return;
    K3Database.execute('DELETE FROM base_department WHERE id = ?', [id]);
    this.load();
  },
  
  refresh: function() {
    this.load();
  }
};

var CustomerModule = {
  init: function() {
    var container = document.getElementById('customer-list');
    if (!container) return;
    
    var html = '<div class="toolbar">';
    html += '<button class="btn btn-primary" onclick="CustomerModule.add()">新增</button>';
    html += '<button class="btn" onclick="CustomerModule.refresh()">刷新</button>';
    html += '</div>';
    html += '<div class="data-grid"><table>';
    html += '<thead><tr><th>编码</th><th>名称</th><th>联系人</th><th>电话</th><th>状态</th><th>操作</th></tr></thead>';
    html += '<tbody id="customer-tbody"></tbody>';
    html += '</table></div>';
    
    container.innerHTML = html;
    this.load();
  },
  
  load: function() {
    var tbody = document.getElementById('customer-tbody');
    if (!tbody) return;
    
    var items = K3Database.query('SELECT * FROM base_customer ORDER BY code');
    
    var html = '';
    items.forEach(function(item) {
      html += '<tr>';
      html += '<td>' + K3Utils.escapeHtml(item.code) + '</td>';
      html += '<td>' + K3Utils.escapeHtml(item.name) + '</td>';
      html += '<td>' + K3Utils.escapeHtml(item.contact || '') + '</td>';
      html += '<td>' + K3Utils.escapeHtml(item.phone || '') + '</td>';
      html += '<td>' + (item.is_enabled ? '启用' : '停用') + '</td>';
      html += '<td class="actions">';
      html += '<a href="javascript:void(0)" onclick="CustomerModule.edit(' + item.id + ')">编辑</a>';
      html += '<a href="javascript:void(0)" onclick="CustomerModule.delete(' + item.id + ')">删除</a>';
      html += '</td>';
      html += '</tr>';
    });
    
    tbody.innerHTML = html || '<tr><td colspan="6" class="empty">暂无数据</td></tr>';
  },
  
  add: function() { this.showForm(null); },
  edit: function(id) { this.showForm(id); },
  
  showForm: function(id) {
    var item = id ? K3Database.queryOne('SELECT * FROM base_customer WHERE id = ?', [id]) : null;
    var title = item ? '编辑客户' : '新增客户';
    
    var html = '<div class="modal-overlay" id="customer-modal">';
    html += '<div class="modal" style="width:450px;">';
    html += '<div class="modal-header">' + title + '<button class="close" onclick="CustomerModule.closeForm()">&times;</button></div>';
    html += '<div class="modal-body">';
    html += '<form id="customer-form">';
    html += '<input type="hidden" id="cust-id" value="' + (item ? item.id : '') + '">';
    html += '<div class="form-row"><label>编码:</label><div class="form-control"><input type="text" id="cust-code" value="' + (item ? K3Utils.escapeHtml(item.code) : '') + '" required></div></div>';
    html += '<div class="form-row"><label>名称:</label><div class="form-control"><input type="text" id="cust-name" value="' + (item ? K3Utils.escapeHtml(item.name) : '') + '" required></div></div>';
    html += '<div class="form-row"><label>简称:</label><div class="form-control"><input type="text" id="cust-short-name" value="' + (item ? K3Utils.escapeHtml(item.short_name || '') : '') + '"></div></div>';
    html += '<div class="form-row"><label>联系人:</label><div class="form-control"><input type="text" id="cust-contact" value="' + (item ? K3Utils.escapeHtml(item.contact || '') : '') + '"></div></div>';
    html += '<div class="form-row"><label>电话:</label><div class="form-control"><input type="text" id="cust-phone" value="' + (item ? K3Utils.escapeHtml(item.phone || '') : '') + '"></div></div>';
    html += '<div class="form-row"><label>地址:</label><div class="form-control"><input type="text" id="cust-address" value="' + (item ? K3Utils.escapeHtml(item.address || '') : '') + '"></div></div>';
    html += '</form></div>';
    html += '<div class="modal-footer"><button class="btn" onclick="CustomerModule.closeForm()">取消</button><button class="btn btn-primary" onclick="CustomerModule.save()">保存</button></div>';
    html += '</div></div>';
    
    document.body.insertAdjacentHTML('beforeend', html);
  },
  
  closeForm: function() {
    var modal = document.getElementById('customer-modal');
    if (modal) modal.remove();
  },
  
  save: function() {
    var id = document.getElementById('cust-id').value;
    var code = K3Utils.trim(document.getElementById('cust-code').value);
    var name = K3Utils.trim(document.getElementById('cust-name').value);
    var shortName = K3Utils.trim(document.getElementById('cust-short-name').value);
    var contact = K3Utils.trim(document.getElementById('cust-contact').value);
    var phone = K3Utils.trim(document.getElementById('cust-phone').value);
    var address = K3Utils.trim(document.getElementById('cust-address').value);
    
    if (!code || !name) {
      alert('请填写完整信息');
      return;
    }
    
    var sql, params;
    if (id) {
      sql = 'UPDATE base_customer SET code=?, name=?, short_name=?, contact=?, phone=?, address=? WHERE id=?';
      params = [code, name, shortName, contact, phone, address, id];
    } else {
      sql = 'INSERT INTO base_customer (code, name, short_name, contact, phone, address) VALUES (?, ?, ?, ?, ?, ?)';
      params = [code, name, shortName, contact, phone, address];
    }
    
    var result = K3Database.execute(sql, params);
    if (result.error) {
      alert('保存失败: ' + result.error);
    } else {
      this.closeForm();
      this.load();
    }
  },
  
  delete: function(id) {
    if (!K3Utils.confirm('确定要删除此客户吗？')) return;
    K3Database.execute('DELETE FROM base_customer WHERE id = ?', [id]);
    this.load();
  },
  
  refresh: function() { this.load(); }
};

var SupplierModule = {
  init: function() {
    var container = document.getElementById('supplier-list');
    if (!container) return;
    
    var html = '<div class="toolbar">';
    html += '<button class="btn btn-primary" onclick="SupplierModule.add()">新增</button>';
    html += '<button class="btn" onclick="SupplierModule.refresh()">刷新</button>';
    html += '</div>';
    html += '<div class="data-grid"><table>';
    html += '<thead><tr><th>编码</th><th>名称</th><th>联系人</th><th>电话</th><th>状态</th><th>操作</th></tr></thead>';
    html += '<tbody id="supplier-tbody"></tbody>';
    html += '</table></div>';
    
    container.innerHTML = html;
    this.load();
  },
  
  load: function() {
    var tbody = document.getElementById('supplier-tbody');
    if (!tbody) return;
    
    var items = K3Database.query('SELECT * FROM base_supplier ORDER BY code');
    
    var html = '';
    items.forEach(function(item) {
      html += '<tr>';
      html += '<td>' + K3Utils.escapeHtml(item.code) + '</td>';
      html += '<td>' + K3Utils.escapeHtml(item.name) + '</td>';
      html += '<td>' + K3Utils.escapeHtml(item.contact || '') + '</td>';
      html += '<td>' + K3Utils.escapeHtml(item.phone || '') + '</td>';
      html += '<td>' + (item.is_enabled ? '启用' : '停用') + '</td>';
      html += '<td class="actions">';
      html += '<a href="javascript:void(0)" onclick="SupplierModule.edit(' + item.id + ')">编辑</a>';
      html += '<a href="javascript:void(0)" onclick="SupplierModule.delete(' + item.id + ')">删除</a>';
      html += '</td>';
      html += '</tr>';
    });
    
    tbody.innerHTML = html || '<tr><td colspan="6" class="empty">暂无数据</td></tr>';
  },
  
  add: function() { this.showForm(null); },
  edit: function(id) { this.showForm(id); },
  
  showForm: function(id) {
    var item = id ? K3Database.queryOne('SELECT * FROM base_supplier WHERE id = ?', [id]) : null;
    var title = item ? '编辑供应商' : '新增供应商';
    
    var html = '<div class="modal-overlay" id="supplier-modal">';
    html += '<div class="modal" style="width:450px;">';
    html += '<div class="modal-header">' + title + '<button class="close" onclick="SupplierModule.closeForm()">&times;</button></div>';
    html += '<div class="modal-body">';
    html += '<form id="supplier-form">';
    html += '<input type="hidden" id="sup-id" value="' + (item ? item.id : '') + '">';
    html += '<div class="form-row"><label>编码:</label><div class="form-control"><input type="text" id="sup-code" value="' + (item ? K3Utils.escapeHtml(item.code) : '') + '" required></div></div>';
    html += '<div class="form-row"><label>名称:</label><div class="form-control"><input type="text" id="sup-name" value="' + (item ? K3Utils.escapeHtml(item.name) : '') + '" required></div></div>';
    html += '<div class="form-row"><label>简称:</label><div class="form-control"><input type="text" id="sup-short-name" value="' + (item ? K3Utils.escapeHtml(item.short_name || '') : '') + '"></div></div>';
    html += '<div class="form-row"><label>联系人:</label><div class="form-control"><input type="text" id="sup-contact" value="' + (item ? K3Utils.escapeHtml(item.contact || '') : '') + '"></div></div>';
    html += '<div class="form-row"><label>电话:</label><div class="form-control"><input type="text" id="sup-phone" value="' + (item ? K3Utils.escapeHtml(item.phone || '') : '') + '"></div></div>';
    html += '<div class="form-row"><label>地址:</label><div class="form-control"><input type="text" id="sup-address" value="' + (item ? K3Utils.escapeHtml(item.address || '') : '') + '"></div></div>';
    html += '</form></div>';
    html += '<div class="modal-footer"><button class="btn" onclick="SupplierModule.closeForm()">取消</button><button class="btn btn-primary" onclick="SupplierModule.save()">保存</button></div>';
    html += '</div></div>';
    
    document.body.insertAdjacentHTML('beforeend', html);
  },
  
  closeForm: function() {
    var modal = document.getElementById('supplier-modal');
    if (modal) modal.remove();
  },
  
  save: function() {
    var id = document.getElementById('sup-id').value;
    var code = K3Utils.trim(document.getElementById('sup-code').value);
    var name = K3Utils.trim(document.getElementById('sup-name').value);
    var shortName = K3Utils.trim(document.getElementById('sup-short-name').value);
    var contact = K3Utils.trim(document.getElementById('sup-contact').value);
    var phone = K3Utils.trim(document.getElementById('sup-phone').value);
    var address = K3Utils.trim(document.getElementById('sup-address').value);
    
    if (!code || !name) {
      alert('请填写完整信息');
      return;
    }
    
    var sql, params;
    if (id) {
      sql = 'UPDATE base_supplier SET code=?, name=?, short_name=?, contact=?, phone=?, address=? WHERE id=?';
      params = [code, name, shortName, contact, phone, address, id];
    } else {
      sql = 'INSERT INTO base_supplier (code, name, short_name, contact, phone, address) VALUES (?, ?, ?, ?, ?, ?)';
      params = [code, name, shortName, contact, phone, address];
    }
    
    var result = K3Database.execute(sql, params);
    if (result.error) {
      alert('保存失败: ' + result.error);
    } else {
      this.closeForm();
      this.load();
    }
  },
  
  delete: function(id) {
    if (!K3Utils.confirm('确定要删除此供应商吗？')) return;
    K3Database.execute('DELETE FROM base_supplier WHERE id = ?', [id]);
    this.load();
  },
  
  refresh: function() { this.load(); }
};

var VoucherModule = {
  init: function() {
    var container = document.getElementById('voucher-list');
    if (!container) return;
    
    var html = '<div class="toolbar">';
    html += '<button class="btn btn-primary" onclick="VoucherModule.add()">新增凭证</button>';
    html += '<button class="btn" onclick="VoucherModule.refresh()">刷新</button>';
    html += '</div>';
    html += '<div class="search-box">';
    html += '<label>凭证号: <input type="text" id="search-voucher-no" style="width:100px"></label>';
    html += '<label>日期: <input type="date" id="search-date-from" style="width:100px"> - <input type="date" id="search-date-to" style="width:100px"></label>';
    html += '<button class="btn" onclick="VoucherModule.search()">查询</button>';
    html += '</div>';
    html += '<div class="data-grid"><table>';
    html += '<thead><tr><th>凭证号</th><th>日期</th><th>期间</th><th>摘要</th><th>借方</th><th>贷方</th><th>状态</th><th>操作</th></tr></thead>';
    html += '<tbody id="voucher-tbody"></tbody>';
    html += '</table></div>';
    
    container.innerHTML = html;
    this.load();
  },
  
  load: function() {
    var tbody = document.getElementById('voucher-tbody');
    if (!tbody) return;
    
    var items = K3Database.query('SELECT * FROM gl_voucher ORDER BY voucher_date DESC, voucher_no');
    
    var html = '';
    items.forEach(function(item) {
      var statusText = ['待审核', '已审核', '已记账'][item.status] || '待审核';
      html += '<tr>';
      html += '<td>' + K3Utils.escapeHtml(item.voucher_no) + '</td>';
      html += '<td>' + K3Utils.formatDate(item.voucher_date, 'yyyy-MM-dd') + '</td>';
      html += '<td>' + K3Utils.escapeHtml(item.period || '') + '</td>';
      html += '<td>' + (item.entry_count || 0) + '条分录</td>';
      html += '<td style="text-align:right">' + K3Utils.formatNumber(item.total_debit) + '</td>';
      html += '<td style="text-align:right">' + K3Utils.formatNumber(item.total_credit) + '</td>';
      html += '<td>' + statusText + '</td>';
      html += '<td class="actions">';
      html += '<a href="javascript:void(0)" onclick="VoucherModule.edit(' + item.id + ')">编辑</a>';
      html += '<a href="javascript:void(0)" onclick="VoucherModule.delete(' + item.id + ')">删除</a>';
      html += '</td>';
      html += '</tr>';
    });
    
    tbody.innerHTML = html || '<tr><td colspan="8" class="empty">暂无数据</td></tr>';
  },
  
  add: function() { this.showForm(null); },
  edit: function(id) { this.showForm(id); },
  
  showForm: function(id) {
    var item = id ? K3Database.queryOne('SELECT * FROM gl_voucher WHERE id = ?', [id]) : null;
    var entries = id ? K3Database.query('SELECT * FROM gl_voucher_entry WHERE voucher_id = ? ORDER BY id', [id]) : [];
    var accounts = K3Database.query('SELECT id, code, name FROM base_account WHERE is_enabled = 1 ORDER BY code');
    
    var title = item ? '编辑凭证' : '新增凭证';
    var today = K3Utils.formatDate(new Date(), 'yyyy-MM-dd');
    
    var html = '<div class="modal-overlay" id="voucher-modal">';
    html += '<div class="modal" style="width:800px;">';
    html += '<div class="modal-header">' + title + '<button class="close" onclick="VoucherModule.closeForm()">&times;</button></div>';
    html += '<div class="modal-body">';
    html += '<form id="voucher-form">';
    html += '<input type="hidden" id="voucher-id" value="' + (item ? item.id : '') + '">';
    html += '<div class="form-row-inline" style="margin-bottom:12px;">';
    html += '<div class="form-group"><label>凭证号:</label><input type="text" id="voucher-no" value="' + (item ? K3Utils.escapeHtml(item.voucher_no) : '') + '" style="width:120px"></div>';
    html += '<div class="form-group"><label>日期:</label><input type="date" id="voucher-date" value="' + (item ? K3Utils.formatDate(item.voucher_date, 'yyyy-MM-dd') : today) + '" style="width:120px"></div>';
    html += '</div>';
    
    html += '<table style="margin-bottom:12px;">';
    html += '<thead><tr><th style="width:40px;">序号</th><th>摘要</th><th style="width:200px;">科目</th><th style="width:100px;">借方</th><th style="width:100px;">贷方</th><th style="width:40px;">操作</th></tr></thead>';
    html += '<tbody id="entry-tbody">';
    
    if (entries.length > 0) {
      entries.forEach(function(entry, idx) {
        html += VoucherModule.entryRow(idx + 1, entry, accounts);
      });
    } else {
      html += this.entryRow(1, null, accounts);
      html += this.entryRow(2, null, accounts);
    }
    
    html += '</tbody></table>';
    html += '<button type="button" class="btn" onclick="VoucherModule.addEntry()">添加分录</button>';
    html += '</form></div>';
    html += '<div class="modal-footer"><button class="btn" onclick="VoucherModule.closeForm()">取消</button><button class="btn btn-primary" onclick="VoucherModule.save()">保存</button></div>';
    html += '</div></div>';
    
    document.body.insertAdjacentHTML('beforeend', html);
    this.accountOptions = accounts;
  },
  
  entryRow: function(idx, entry, accounts) {
    var html = '<tr>';
    html += '<td style="text-align:center">' + idx + '</td>';
    html += '<td><input type="text" class="entry-summary" value="' + (entry ? K3Utils.escapeHtml(entry.summary || '') : '') + '" style="width:100%"></td>';
    html += '<td><select class="entry-account" style="width:100%">';
    html += '<option value="">-- 请选择 --</option>';
    accounts.forEach(function(acc) {
      var selected = entry && entry.account_id === acc.id ? ' selected' : '';
      html += '<option value="' + acc.id + '"' + selected + '>' + acc.code + ' ' + acc.name + '</option>';
    });
    html += '</select></td>';
    html += '<td><input type="text" class="entry-debit" value="' + (entry && entry.debit ? K3Utils.formatNumber(entry.debit) : '') + '" style="width:100%;text-align:right"></td>';
    html += '<td><input type="text" class="entry-credit" value="' + (entry && entry.credit ? K3Utils.formatNumber(entry.credit) : '') + '" style="width:100%;text-align:right"></td>';
    html += '<td style="text-align:center"><button type="button" class="btn btn-sm" onclick="this.closest(\'tr\').remove()">×</button></td>';
    html += '</tr>';
    return html;
  },
  
  addEntry: function() {
    var tbody = document.getElementById('entry-tbody');
    var idx = tbody.children.length + 1;
    tbody.insertAdjacentHTML('beforeend', this.entryRow(idx, null, this.accountOptions || []));
  },
  
  closeForm: function() {
    var modal = document.getElementById('voucher-modal');
    if (modal) modal.remove();
  },
  
  save: function() {
    var id = document.getElementById('voucher-id').value;
    var voucherNo = K3Utils.trim(document.getElementById('voucher-no').value);
    var voucherDate = document.getElementById('voucher-date').value;
    
    if (!voucherNo || !voucherDate) {
      alert('请填写凭证号和日期');
      return;
    }
    
    var rows = document.querySelectorAll('#entry-tbody tr');
    var entries = [];
    var totalDebit = 0, totalCredit = 0;
    
    rows.forEach(function(row) {
      var accountId = row.querySelector('.entry-account').value;
      var summary = K3Utils.trim(row.querySelector('.entry-summary').value);
      var debit = K3Utils.parseNumber(row.querySelector('.entry-debit').value);
      var credit = K3Utils.parseNumber(row.querySelector('.entry-credit').value);
      
      if (accountId && (debit > 0 || credit > 0)) {
        entries.push({ accountId: accountId, summary: summary, debit: debit, credit: credit });
        totalDebit += debit;
        totalCredit += credit;
      }
    });
    
    if (entries.length === 0) {
      alert('请至少录入一条分录');
      return;
    }
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      alert('借贷不平衡，请检查');
      return;
    }
    
    var period = voucherDate.substring(0, 7);
    
    K3Database.execute('BEGIN TRANSACTION');
    
    try {
      var voucherId;
      if (id) {
        K3Database.execute(
          'UPDATE gl_voucher SET voucher_no=?, voucher_date=?, period=?, entry_count=?, total_debit=?, total_credit=? WHERE id=?',
          [voucherNo, voucherDate, period, entries.length, totalDebit, totalCredit, id]
        );
        voucherId = id;
        K3Database.execute('DELETE FROM gl_voucher_entry WHERE voucher_id = ?', [voucherId]);
      } else {
        K3Database.execute(
          'INSERT INTO gl_voucher (voucher_no, voucher_date, period, entry_count, total_debit, total_credit, maker) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [voucherNo, voucherDate, period, entries.length, totalDebit, totalCredit, K3App.currentUser ? K3App.currentUser.username : '']
        );
        var result = K3Database.queryOne('SELECT last_insert_rowid() as id');
        voucherId = result.id;
      }
      
      entries.forEach(function(entry) {
        K3Database.execute(
          'INSERT INTO gl_voucher_entry (voucher_id, account_id, summary, debit, credit) VALUES (?, ?, ?, ?, ?)',
          [voucherId, entry.accountId, entry.summary, entry.debit, entry.credit]
        );
      });
      
      K3Database.execute('COMMIT');
      this.closeForm();
      this.load();
    } catch (e) {
      K3Database.execute('ROLLBACK');
      alert('保存失败: ' + e.message);
    }
  },
  
  delete: function(id) {
    if (!K3Utils.confirm('确定要删除此凭证吗？')) return;
    K3Database.execute('DELETE FROM gl_voucher_entry WHERE voucher_id = ?', [id]);
    K3Database.execute('DELETE FROM gl_voucher WHERE id = ?', [id]);
    this.load();
  },
  
  search: function() {
    var voucherNo = K3Utils.trim(document.getElementById('search-voucher-no').value);
    var dateFrom = document.getElementById('search-date-from').value;
    var dateTo = document.getElementById('search-date-to').value;
    
    var sql = 'SELECT * FROM gl_voucher WHERE 1=1';
    var params = [];
    
    if (voucherNo) {
      sql += ' AND voucher_no LIKE ?';
      params.push('%' + voucherNo + '%');
    }
    if (dateFrom) {
      sql += ' AND voucher_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND voucher_date <= ?';
      params.push(dateTo);
    }
    sql += ' ORDER BY voucher_date DESC, voucher_no';
    
    var tbody = document.getElementById('voucher-tbody');
    var items = K3Database.query(sql, params);
    
    var html = '';
    items.forEach(function(item) {
      var statusText = ['待审核', '已审核', '已记账'][item.status] || '待审核';
      html += '<tr>';
      html += '<td>' + K3Utils.escapeHtml(item.voucher_no) + '</td>';
      html += '<td>' + K3Utils.formatDate(item.voucher_date, 'yyyy-MM-dd') + '</td>';
      html += '<td>' + K3Utils.escapeHtml(item.period || '') + '</td>';
      html += '<td>' + (item.entry_count || 0) + '条分录</td>';
      html += '<td style="text-align:right">' + K3Utils.formatNumber(item.total_debit) + '</td>';
      html += '<td style="text-align:right">' + K3Utils.formatNumber(item.total_credit) + '</td>';
      html += '<td>' + statusText + '</td>';
      html += '<td class="actions">';
      html += '<a href="javascript:void(0)" onclick="VoucherModule.edit(' + item.id + ')">编辑</a>';
      html += '<a href="javascript:void(0)" onclick="VoucherModule.delete(' + item.id + ')">删除</a>';
      html += '</td>';
      html += '</tr>';
    });
    
    tbody.innerHTML = html || '<tr><td colspan="8" class="empty">暂无数据</td></tr>';
  },
  
  refresh: function() {
    document.getElementById('search-voucher-no').value = '';
    document.getElementById('search-date-from').value = '';
    document.getElementById('search-date-to').value = '';
    this.load();
  }
};

var LedgerModule = {
  init: function() {
    var container = document.getElementById('ledger-query');
    if (!container) return;
    
    var accounts = K3Database.query('SELECT id, code, name FROM base_account WHERE is_enabled = 1 ORDER BY code');
    
    var html = '<div class="search-box">';
    html += '<label>科目: <select id="ledger-account"><option value="">-- 全部 --</option>';
    accounts.forEach(function(acc) {
      html += '<option value="' + acc.id + '">' + acc.code + ' ' + acc.name + '</option>';
    });
    html += '</select></label>';
    html += '<label>期间: <input type="month" id="ledger-period" value="' + K3Utils.getPeriod() + '"></label>';
    html += '<button class="btn btn-primary" onclick="LedgerModule.query()">查询</button>';
    html += '</div>';
    html += '<div class="data-grid"><table>';
    html += '<thead><tr><th>日期</th><th>凭证号</th><th>摘要</th><th>借方</th><th>贷方</th><th>余额</th></tr></thead>';
    html += '<tbody id="ledger-tbody"></tbody>';
    html += '</table></div>';
    
    container.innerHTML = html;
  },
  
  query: function() {
    var accountId = document.getElementById('ledger-account').value;
    var period = document.getElementById('ledger-period').value;
    
    var tbody = document.getElementById('ledger-tbody');
    
    var sql = 'SELECT v.voucher_date, v.voucher_no, e.summary, e.debit, e.credit ' +
              'FROM gl_voucher_entry e ' +
              'JOIN gl_voucher v ON e.voucher_id = v.id ' +
              'WHERE 1=1';
    var params = [];
    
    if (accountId) {
      sql += ' AND e.account_id = ?';
      params.push(accountId);
    }
    if (period) {
      sql += ' AND v.period = ?';
      params.push(period);
    }
    sql += ' ORDER BY v.voucher_date, v.voucher_no';
    
    var items = K3Database.query(sql, params);
    var balance = 0;
    
    var html = '';
    items.forEach(function(item) {
      balance += (item.debit || 0) - (item.credit || 0);
      html += '<tr>';
      html += '<td>' + K3Utils.formatDate(item.voucher_date, 'yyyy-MM-dd') + '</td>';
      html += '<td>' + K3Utils.escapeHtml(item.voucher_no) + '</td>';
      html += '<td>' + K3Utils.escapeHtml(item.summary || '') + '</td>';
      html += '<td style="text-align:right">' + K3Utils.formatNumber(item.debit) + '</td>';
      html += '<td style="text-align:right">' + K3Utils.formatNumber(item.credit) + '</td>';
      html += '<td style="text-align:right">' + K3Utils.formatNumber(balance) + '</td>';
      html += '</tr>';
    });
    
    tbody.innerHTML = html || '<tr><td colspan="6" class="empty">暂无数据</td></tr>';
  }
};

var BalanceReportModule = {
  init: function() {
    var container = document.getElementById('balance-report');
    if (!container) return;
    
    var html = '<div class="search-box">';
    html += '<label>日期: <input type="date" id="balance-date" value="' + K3Utils.formatDate(new Date(), 'yyyy-MM-dd') + '"></label>';
    html += '<button class="btn btn-primary" onclick="BalanceReportModule.generate()">生成报表</button>';
    html += '<button class="btn" onclick="BalanceReportModule.print()">打印</button>';
    html += '</div>';
    html += '<div id="balance-content"></div>';
    
    container.innerHTML = html;
  },
  
  generate: function() {
    var date = document.getElementById('balance-date').value;
    var content = document.getElementById('balance-content');
    
    var assetAccounts = K3Database.query(
      "SELECT a.id, a.code, a.name, a.direction FROM base_account a WHERE a.category = '资产' ORDER BY a.code"
    );
    
    var html = '<h2 style="text-align:center;margin-bottom:16px;">资产负债表</h2>';
    html += '<p style="text-align:center;margin-bottom:16px;">编制单位: ' + (K3App.currentAccountBook ? K3App.currentAccountBook.company_name : '') + '  日期: ' + date + '</p>';
    html += '<table>';
    html += '<thead><tr><th>资产</th><th style="width:100px;">期末余额</th><th style="width:100px;">年初余额</th></tr></thead>';
    html += '<tbody>';
    
    assetAccounts.forEach(function(acc) {
      var balance = BalanceReportModule.getAccountBalance(acc.id, date);
      if (balance !== 0) {
        html += '<tr>';
        html += '<td>' + acc.code + ' ' + K3Utils.escapeHtml(acc.name) + '</td>';
        html += '<td style="text-align:right">' + K3Utils.formatNumber(Math.abs(balance)) + '</td>';
        html += '<td style="text-align:right">-</td>';
        html += '</tr>';
      }
    });
    
    html += '</tbody></table>';
    content.innerHTML = html;
  },
  
  getAccountBalance: function(accountId, date) {
    var entries = K3Database.query(
      'SELECT e.debit, e.credit, a.direction FROM gl_voucher_entry e ' +
      'JOIN gl_voucher v ON e.voucher_id = v.id ' +
      'JOIN base_account a ON e.account_id = a.id ' +
      'WHERE e.account_id = ? AND v.voucher_date <= ?',
      [accountId, date]
    );
    
    var balance = 0;
    entries.forEach(function(entry) {
      if (entry.direction === '借') {
        balance += (entry.debit || 0) - (entry.credit || 0);
      } else {
        balance += (entry.credit || 0) - (entry.debit || 0);
      }
    });
    return balance;
  },
  
  print: function() {
    var content = document.getElementById('balance-content').innerHTML;
    var win = window.open('', '_blank');
    win.document.write('<html><head><title>资产负债表</title>');
    win.document.write('<style>body{font-family:SimSun;font-size:12px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #000;padding:4px;}</style>');
    win.document.write('</head><body>' + content + '</body></html>');
    win.document.close();
    win.print();
  }
};

var IncomeReportModule = {
  init: function() {
    var container = document.getElementById('income-report');
    if (!container) return;
    
    var html = '<div class="search-box">';
    html += '<label>期间: <input type="month" id="income-period-from" value="' + K3Utils.getPeriod() + '"> 至 <input type="month" id="income-period-to" value="' + K3Utils.getPeriod() + '"></label>';
    html += '<button class="btn btn-primary" onclick="IncomeReportModule.generate()">生成报表</button>';
    html += '<button class="btn" onclick="IncomeReportModule.print()">打印</button>';
    html += '</div>';
    html += '<div id="income-content"></div>';
    
    container.innerHTML = html;
  },
  
  generate: function() {
    var periodFrom = document.getElementById('income-period-from').value;
    var periodTo = document.getElementById('income-period-to').value;
    var content = document.getElementById('income-content');
    
    var incomeAccounts = K3Database.query(
      "SELECT id, code, name FROM base_account WHERE category = '损益' AND direction = '贷' ORDER BY code"
    );
    var expenseAccounts = K3Database.query(
      "SELECT id, code, name FROM base_account WHERE category = '损益' AND direction = '借' ORDER BY code"
    );
    
    var totalIncome = 0, totalExpense = 0;
    
    var html = '<h2 style="text-align:center;margin-bottom:16px;">利润表</h2>';
    html += '<p style="text-align:center;margin-bottom:16px;">期间: ' + periodFrom + ' 至 ' + periodTo + '</p>';
    html += '<table>';
    html += '<thead><tr><th>项目</th><th style="width:120px;">本期金额</th></tr></thead>';
    html += '<tbody>';
    
    html += '<tr><td colspan="2" style="background:#f0f0f0;font-weight:bold;">一、收入</td></tr>';
    incomeAccounts.forEach(function(acc) {
      var amount = IncomeReportModule.getAccountAmount(acc.id, periodFrom, periodTo);
      if (amount !== 0) {
        totalIncome += amount;
        html += '<tr>';
        html += '<td style="padding-left:20px;">' + K3Utils.escapeHtml(acc.name) + '</td>';
        html += '<td style="text-align:right">' + K3Utils.formatNumber(amount) + '</td>';
        html += '</tr>';
      }
    });
    
    html += '<tr><td style="font-weight:bold;">收入合计</td><td style="text-align:right;font-weight:bold;">' + K3Utils.formatNumber(totalIncome) + '</td></tr>';
    
    html += '<tr><td colspan="2" style="background:#f0f0f0;font-weight:bold;">二、费用</td></tr>';
    expenseAccounts.forEach(function(acc) {
      var amount = IncomeReportModule.getAccountAmount(acc.id, periodFrom, periodTo);
      if (amount !== 0) {
        totalExpense += amount;
        html += '<tr>';
        html += '<td style="padding-left:20px;">' + K3Utils.escapeHtml(acc.name) + '</td>';
        html += '<td style="text-align:right">' + K3Utils.formatNumber(amount) + '</td>';
        html += '</tr>';
      }
    });
    
    html += '<tr><td style="font-weight:bold;">费用合计</td><td style="text-align:right;font-weight:bold;">' + K3Utils.formatNumber(totalExpense) + '</td></tr>';
    
    var profit = totalIncome - totalExpense;
    html += '<tr><td style="font-weight:bold;">三、利润总额</td><td style="text-align:right;font-weight:bold;">' + K3Utils.formatNumber(profit) + '</td></tr>';
    
    html += '</tbody></table>';
    content.innerHTML = html;
  },
  
  getAccountAmount: function(accountId, periodFrom, periodTo) {
    var entries = K3Database.query(
      'SELECT SUM(e.debit) as debit, SUM(e.credit) as credit FROM gl_voucher_entry e ' +
      'JOIN gl_voucher v ON e.voucher_id = v.id ' +
      'WHERE e.account_id = ? AND v.period >= ? AND v.period <= ?',
      [accountId, periodFrom, periodTo]
    );
    
    if (entries.length > 0) {
      return (entries[0].credit || 0) - (entries[0].debit || 0);
    }
    return 0;
  },
  
  print: function() {
    var content = document.getElementById('income-content').innerHTML;
    var win = window.open('', '_blank');
    win.document.write('<html><head><title>利润表</title>');
    win.document.write('<style>body{font-family:SimSun;font-size:12px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #000;padding:4px;}</style>');
    win.document.write('</head><body>' + content + '</body></html>');
    win.document.close();
    win.print();
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    K3App: K3App,
    AccountModule: AccountModule,
    DepartmentModule: DepartmentModule,
    CustomerModule: CustomerModule,
    SupplierModule: SupplierModule,
    VoucherModule: VoucherModule,
    LedgerModule: LedgerModule,
    BalanceReportModule: BalanceReportModule,
    IncomeReportModule: IncomeReportModule
  };
}
