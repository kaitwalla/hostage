var {ipcRenderer, remote} = require('electron')
var sweetAlert = require('sweetalert')

var Buttons = function() {
	var public = {
		do_action: function(type) {
			private[type]();
		}
	};
	var private = {
		add_vhost: function() {
			Modal.load('new');
		},
		cancel: function() {
			Modal.hide();
		},
		close_modal: function() {
			Modal.hide();
		},
		delete: function() {
			Modal.hide();
			ipcRenderer.send('remove_host',Application.site_info.slug);
		},
		download: function() {
			sweetAlert({
			  title: "Download Config",
			  text: "This will save the information and download a JSON file you can use in a different instance",
			  type: "info",
			  showCancelButton: true,
			  confirmButtonColor: "#6fc491",
			  confirmButtonText: "Save & Download",
			  closeOnConfirm: true
			},
			function(){
			  Buttons.do_action('save');
			  Info.download();
			});
		},
		edit: function() {
			Modal.load('edit_settings');
		},
		edit_settings: function() {
			Modal.load('server_settings');
		},
		edit_site: function() {
			Modal.load('edit_site');
		},
		load: function() {
			private.load_config();
		},
		load_config: function() {
			sweetAlert({
			  title: "Upload Config",
			  text: "This will allow you to import settings exported from another instance. If it's set, make sure to check the location of your SSH key.",
			  type: "info",
			  showCancelButton: true,
			  confirmButtonColor: "#6fc491",
			  confirmButtonText: "Upload file",
			  closeOnConfirm: true
			},
			function(){
			  Info.upload();
			});
		},
		save: function() {
			if (Modal.check_requireds()) {
				var purpose = Modal.get_purpose();
				switch (purpose) {
					case 'setup':
					case 'edit_settings':
						Info.set('server_settings',Modal.get_data().field_data);
						Modal.hide();
						Application.screen.show('list');
						Application.set_server_information();
					break;
					case 'new':
						var data = Modal.get_data();
						data.field_data.slug = 'ddm-'+data.field_data.VirtualhostName.replace(/[^0-9a-z]/gi, '').toLowerCase();
						data.field_data.status = false;
						data.fields.push('slug');
						data.fields.push('status');
						ipcRenderer.send('update_host',data);
					break;
					case 'edit_site':
						var data = Modal.get_data(); 
						data.field_data.slug = Application.site_info.slug;
						data.field_data.status = Application.site_info.status;
						data.fields.push('slug');
						data.fields.push('status');
						ipcRenderer.send('update_host',data);
					break;
				}
			}
		},
		setup: function() {
			Modal.load('setup');
		},
		toggle_host: function() {
			$('li[data-slug="'+Application.site_slug+'"] .indicator').addClass('working').removeClass('active');
			if (Application.site_info.status) {
				ipcRenderer.send('disable_host',Application.site_info);
			} else {
				ipcRenderer.send('enable_host',Application.site_info);
			}
		}
	};
	return public;
}();

var Info = function() {
	var public = {
		download: function() {
			var contents = JSON.stringify({key: 'DynaDevManager',data: localStorage});
			ipcRenderer.send('download_configuration',contents);
		},
		get: function(item) {
			return private.storage.get(item);
		},
		set: function(item,value) {
			return private.storage.set(item,value);
		},
		upload: function() {
			ipcRenderer.send('upload_configuration');
		}
	};
	var private = {
		storage: {
			get: function(item) {
				var data = private.storage.store.getItem(item);
				if (data) {
					return JSON.parse(data);
				} else {
					return data;
				}
			},
			set: function(item,value) {
				return private.storage.store.setItem(item,JSON.stringify(value));
			},
			store: localStorage,
		}
	};
	return public;
}();

var Modal = function() {
	var public = {
		check_requireds: function() {
			var missing_input = false;
			$('#modal form input').filter('[required]:visible').each(function() {
				if ($(this).val() == '') {
					missing_input = true;
				}
			});
			if (missing_input) {
				sweetAlert("Oops", "Please fill out all the fields", "error");
				return false;
			} else {
				return true;
			}
		},
		get_data: function() {
			var data = {
				fields: [],
				field_data: {}
			};
			$('#modal form input').each(function() {
				if ($(this).attr('name') == 'purpose')
					return false
				data.fields.push($(this).attr('name'));
				data.field_data[$(this).attr('name')] = $(this).val();
			});
			return data;
		},
		get_purpose: function() {
			return private.purpose.val();
		},
		hide: function() {
			public.background.removeClass('shown');
			public.el.removeClass('shown');
		},
		load: function(modal_name) {
			private.load_modal_contents(modal_name);
			public.show();
		},
		show: function() {
			if (!public.background.hasClass('shown')) { 
				public.background.addClass('showing');
				public.el.addClass('showing');
				for (var i = 1; i !== 5; i++) {
					setTimeout(function() {
						var opacity = parseFloat(Modal.background.css('opacity'))+0.2;
						Modal.background.css('opacity',opacity);
						if (opacity == 0.8) {
							Modal.background.addClass('shown').removeClass('showing').removeAttr('style');
							Modal.el.addClass('shown').removeClass('showing');
						}
					},200 * i);
				}
			}
		}
	};
	var private = {
		get_button_el: function(slug) {
			return $('<a href="javascript://" class="button" data-action="'+slug+'">'+slug.charAt(0).toUpperCase()+slug.slice(1)+'</a>');
		},
		fields: {
			default: [ 
				{type: 'text', name: 'Virtualhost Name', placeholder: 'Nickname you\'ll recognize', required: true}, 
				{type: 'text', name: 'URL', placeholder: 'The dev URL you\'re going to use', required: true},
				{type: 'text', name: 'Directory Path', placeholder: 'Absolute path, e.g., /var/www/html/folder', required: true}
			],
			server: [ 
				{ type: 'text', name: 'Server Address', placeholder: 'IP address (for the local hosts file)', required: true}, 
				{ type: 'text', name: 'Port', placeholder: 'Usually 22', required: true},
				{ type: 'text', name: 'SSH user', placeholder: 'Must have sudo access', required: true},
				{ type: 'text', name: 'Password', placeholder: 'Server password for user', required: true},
				{ type: 'radio', name: 'SSH Connection Type', options: ['Key','Password']}, 
				{ type: 'text', name: 'Key Location', placeholder: 'Full path. Usually {your user dir}/.ssh/id_rsa', required: true}
			]
		},
		initialize: function() {
			public.background = $('#modal-background');
			public.el = $('#modal');
			private.h2 = $('#modal #modal-header h2');
			private.content_area = $('#modal #modal-fields');
			private.button_area = $('#modal #modal-buttons');
			private.close_button = $('#modal #modal-close a');
			private.purpose = $('#modal input[name="purpose"]');
			public.background.on('click',function() {
				Modal.hide();
			});
			private.set_field_click_handlers();
		},
		load_buttons: function(buttons) {
			buttons.forEach(function(value,index,array) {
				private.get_button_el(value).appendTo(private.button_area);
			});
		},
		load_field_data: function(modal_name) {
			switch (modal_name) {
				case 'edit_settings':
					var server_settings = Info.get('server_settings');
					$('#modal input[name="ServerAddress"]').val(server_settings.ServerAddress);
					$('#modal input[name="Port"]').val(server_settings.Port);
					$('#modal input[name="SSHuser"]').val(server_settings.SSHuser);
					$('#modal input[name="Password"]').val(server_settings.Password);
					$('#modal input[name="KeyLocation"]').val(server_settings.KeyLocation);
					$('#modal input[name="SSHConnectionType"][value="'+server_settings.SSHConnectionType+'"]').click();
				break;
				case 'edit_site':
					var site_info = Application.site_info;
					$('#modal input[name="VirtualhostName"]').val(site_info.VirtualhostName);
					$('#modal input[name="URL"]').val(site_info.URL);
					$('#modal input[name="DirectoryPath"]').val(site_info.DirectoryPath);
				break;
			}
		},
		load_fields: function(slug) {
			if (private.fields[slug]) {
				private.fields[slug].forEach(function(value,index,array) {
					var field_slug = value.name.replace(/[^0-9a-z]/gi, '');
					var required = (value.required) ? ' required' : '';
					switch (value.type) {
						case 'text':
							$('<div class="form-field" data-field="'+field_slug+'"><label for='+field_slug+'">'+value.name+'<input'+required+' placeholder="'+value.placeholder+'" type="text" name="'+field_slug+'"/></label></div>').appendTo(private.content_area);	
						break;
						case 'radio': 
							var form_div = $('<div class="form-field" data-field="'+field_slug+'"><h4>'+value.name+'</h4></div>');
							value.options.forEach(function(inside_value,inside_index,inside_array) {
								var inside_value_slug = inside_value.replace(/[^0-9a-z]/gi, '');
								$('<label><input type="radio" name="'+field_slug+'" value="'+inside_value_slug+'">'+inside_value+'</label>').appendTo(form_div);		
							});
							inputs = form_div.appendTo(private.content_area);
							setTimeout(function() { $('input',inputs).eq(0).click(); }, 500);
						break;
					}
					
				});
			}
		},
		load_modal_contents: function(slug) {
			private.button_area.html('');
			private.content_area.html('');
			private.purpose.val(slug);
			private.h2.text(private.modal_contents[slug].title);
			private.load_fields(private.modal_contents[slug].fields);
			private.load_buttons(private.modal_contents[slug].buttons);
			private.load_field_data(slug);
		},
		modal_contents: {
			new: {
				title: 'Add host',
				fields: 'default',
				buttons: ['cancel','save']
			},
			setup: {
				title: 'Initial Setup',
				fields: 'server',
				buttons : ['save']
			},
			edit_site: {
				title: 'Edit Virtualhost',
				fields: 'default',
				buttons: ['delete','cancel','save']
			},
			edit_settings: {
				title: 'Edit Server Settings',
				fields: 'server',
				buttons : ['cancel','save']
			},
			server_settings: {
				title: 'Server Settings',
				fields: '',
				buttons: ['edit','download','load']
			},
		},
		set_field_click_handlers: function() {
			$('#modal').on('click','input[name="SSHConnectionType"]',function() {
				if ($(this).val() == 'Key') {
					$('div.form-field[data-field="KeyLocation"]').show();
					if ($('#modal input[name="SSHuser"]').val() == 'root') {
						$('#modal .form-field[data-field="Password"]').hide();	
					}
				} else {
					$('div.form-field[data-field="KeyLocation"]').hide();
					if ($('#modal input[name="SSHuser"]').val() == 'root') {
						$('#modal .form-field[data-field="Password"]').show();	
					}
				}
			});
			$('#modal').on('keyup','input[name="SSHuser"]',function() {
				if ($('#modal input[name="SSHuser"]').val() == 'root') {
					$('#modal .form-field[data-field="Password"]').hide();
				} else {
					$('#modal .form-field[data-field="Password"]').show();
				}
			});
		}
	}
	private.initialize();
	return public;
}();

var Application = function() {
	var public = {
		list: {
			add_host: function(host) {
				var status = (host.status) ? ' active' : '';
				$('<li data-slug="'+host.slug+'"><a href="javascript://" class="button" data-action="toggle_host"><span class="indicator'+status+'"></span></a><span>'+host.VirtualhostName+'</span><a href="javascript://" class="button" data-action="edit_site" data-slug="'+host.slug+'">Edit</a></li>').appendTo('#host-list');
			},
			remove_host: function(host_slug){
				$('#host-list li[data-slug="'+host_slug+'"]').remove();
			},
			reset: function() {
				$('#host-list li').remove();
				private.managed_hosts.hosts_array.forEach( function(value,index,array) {
					public.list.add_host(private.managed_hosts.hosts[value]);
				});
			}
		},
		set_server_information: function() {
			ipcRenderer.send('set_connection_info',Info.get('server_settings'));
		},
		set_site: function(site_slug) {
			public.site_slug = site_slug;
			public.site_info = private.managed_hosts.hosts[site_slug];
		},
		screen: {
			current: false,
			screens: {
				list : '#content',
				setup : '#first-load'
			},
			show: function(screen) {
				if (screen !== public.screen.current) {
					$('.screen-showing').fadeOut().removeClass('screen-showing');
					$(public.screen.screens[screen]).fadeIn().addClass('screen-showing');
					public.screen.current = screen;
				}
			}
		}
	};
	var private = {
		configuration: {
			check: function() {
				if (!Info.get('server_settings')) {
					public.screen.show('setup');
				} else {
					private.managed_hosts.load();
					public.screen.show('list');
					public.list.reset();
					public.set_server_information();
				}
			},
		},
		managed_hosts: {
			add_host: function(host) {
				if ($.inArray(host.slug,private.managed_hosts.hosts_array) === -1) {
					private.managed_hosts.hosts_array.push(host.slug);
					public.list.remove_host(host.slug);	
				}
				private.managed_hosts.hosts[host.slug] = host;
				private.managed_hosts.save();
				public.list.add_host(host);
				Modal.hide();
			},
			disable_host: function() {
				private.managed_hosts.hosts[Application.site_slug].status = false;
				private.managed_hosts.save();
			},
			enable_host: function() {
				private.managed_hosts.hosts[Application.site_slug].status = true;
				private.managed_hosts.save();
			},
			hosts: {},
			hosts_array: [],
			load: function() {
				var data = Info.get('hosts');
				if (data) {
					private.managed_hosts.hosts = data.hosts;
					private.managed_hosts.hosts_array = data.hosts_array;
				}
			},
			remove_host: function(host_slug) {
				delete private.managed_hosts.hosts[host_slug];
				private.managed_hosts.hosts_array.splice(private.managed_hosts.hosts_array.indexOf(host_slug),1);
				private.managed_hosts.save();
				public.list.remove_host(host_slug);
			},
			save: function() {
				var data = {
					hosts: private.managed_hosts.hosts,
					hosts_array: private.managed_hosts.hosts_array
				};
				Info.set('hosts',data);
			},
			set_event_listeners: function() {
				ipcRenderer.on('config_loaded', (event,arg) => {
					var hosts = JSON.parse(arg.hosts);
					private.managed_hosts.hosts = hosts.hosts;
					private.managed_hosts.hosts_array = hosts.hosts_array;
					private.managed_hosts.save();
					Info.set('server_settings',JSON.parse(arg.server_settings));
					Modal.load('edit_settings');
					Application.list.reset();
				});
				ipcRenderer.on('process_hosts', (event, arg) => {  
			    	arg.forEach( function(value,index,array) {
			    		private.managed_hosts.hosts[value[1]] = value[0];
			    		private.managed_hosts.hosts_array.push(value[1])
			    	});
				});
				ipcRenderer.on('error', (event, arg) => {  
			    	sweetAlert("Oops", arg, "error");
				});
				ipcRenderer.on('host_enabled', (event, arg) => {
					$('li[data-slug="'+public.site_slug+'"] .indicator').removeClass('working').addClass('active');
					private.managed_hosts.enable_host(arg);
				});
				ipcRenderer.on('host_disabled', (event, arg) => {
					$('li[data-slug="'+public.site_slug+'"] .indicator').removeClass('working')
					private.managed_hosts.disable_host(arg);
				});
				ipcRenderer.on('host_removed', (event, arg) => {
					private.managed_hosts.remove_host(arg);
				});
				ipcRenderer.on('host_saved', (event,arg) => {
					private.managed_hosts.add_host(arg);
				});
			}
		},
		initialize: function() {
			private.set_click_handlers();
			private.managed_hosts.set_event_listeners();
			private.configuration.check();
		},
		set_click_handlers: function() {
			$('#first-load, #content #top-buttons, #modal').on('click','a.button',function() {
				Buttons.do_action($(this).data('action'));
			});
			$('#content').on('click','#host-list a',function() {
				public.set_site($(this).parent().data('slug'));
				Buttons.do_action($(this).data('action'));
			});
		},
		setup: function() {
			Modal.load('setup');
			$('#first-load').fadeOut();
		}
	};
	private.initialize();
	return public;
}();