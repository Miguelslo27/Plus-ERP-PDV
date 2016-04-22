"use strict";

var debug = document.location.host == 'erp.personal';

// auto start
(function($, window, document) {
	
window.app = (function() {
	// privats // App Persistence
	var properties = {
		user           : erpStorage.get('user'),
		user_bar       : erpStorage.get('user_bar'),
		cached_screens : erpStorage.get('cached_screens'),
		active_screen  : erpStorage.get('active_screen'),
		app_data       : erpStorage.get('app_data'),
		app_status     : erpStorage.get('app_status'),
		ticket         : erpStorage.get('ticket')
	};

	// methods
	var methods = {
		init: function() {
			if(!methods.getUser()) {
				methods.setApp_status('locked');
				methods.loadScreen('login');
			} else {
				var active_screen = methods.getActive_screen();
				methods.openApp(active_screen);
			}

			methods.bindEvents();
		},
		openApp: function(active_screen) {
			var cached_screens = methods.getScreens(),
				active_screen  = active_screen || 'open_app';

			if(!cached_screens || !cached_screens[active_screen]) {
				cached_screens                = cached_screens || {};
				cached_screens[active_screen] = {};
				methods.setScreens(cached_screens);
			}

			methods.loadScreen(active_screen, null, function(screen_loaded, html) {
				if(active_screen == 'open_app') {
					methods.loadFragment('#open-app', 'transaction/ticket', true, null, function() {
						methods.loadFragment('#open-app', 'transaction/context', true, null, function() {
							methods.loadTicket();
							cached_screens['open_app'].name = 'Caja';
							cached_screens['open_app'].html = $('#all-wrap').html();

							var ticket = methods.getTicket();
							if(ticket && ticket.products.length) {
								methods.showTicketCommands(true);
							}

							methods.setScreensToTaskBar();
						});
					});
				} else {
					// TODO cargar las dependencias segun la pantalla activa
					// debugFn('Pantalla Activa: ' + active_screen);
					switch(active_screen) {}
				}
			});
		},
		getUser: function() {
			return properties.user;
		},
		setUser: function(user) {
			properties.user = user;
			erpStorage.set('user', 'object', user);
		},
		getUser_bar: function() {
			return properties.user_bar;
		},
		setUser_bar: function(user_bar) {
			properties.user_bar = user_bar;
			erpStorage.set('user_bar', 'object', user_bar);
		},
		getScreens: function() {
			return properties.cached_screens;
		},
		setScreens: function(cached_screens) {
			properties.cached_screens = cached_screens;
			erpStorage.set('cached_screens', 'array', cached_screens);
		},
		getActive_screen: function() {
			return properties.active_screen;
		},
		setActive_screen: function(active_screen) {
			properties.active_screen = active_screen;
			erpStorage.set('active_screen', 'string', active_screen);
		},
		getApp_data: function() {
			return properties.app_data;
		},
		setApp_data: function(app_data) {
			properties.app_data = app_data;
			erpStorage.set('app_data', 'object', app_data);
		},
		getApp_status: function() {
			return properties.app_status;
		},
		setApp_status: function(app_status) {
			properties.app_status = app_status;
			erpStorage.set('app_status', 'string', app_status);
		},
		getTicket: function() {
			return properties.ticket;
		},
		setTicket: function(ticket) {
			properties.ticket = ticket;
			erpStorage.set('ticket', 'object', ticket);
		},
		login: function() {
			var requestdata = {
				__action: 'login',
				username: $('#username').val(),
				password: $('#password').val()
			};
			// methods.doRequest('get', {__action: 'login/' + $('#username').val() + '/' + $('#password').val()}, function(response, status, request) {
			methods.doRequest('post', requestdata, function(response, status, request) {
				if(status == 'success' && response.status == 'success' && response.data.user) {
					methods.setUser(response.data.user);
					methods.setApp_status('open');
					methods.openApp('open_app');
				}
			});
		},
		logout: function() {
			// TODO - Logout a traves de la API para evitar errores
			methods.setUser(null);
			methods.setUser_bar(null);
			methods.setScreens(null);
			methods.setActive_screen(null);
			methods.setApp_data(null);
			methods.setApp_status(null);
			methods.setTicket(null);
			erpStorage.clearErp();
			methods.init();
		},
		setScreensToTaskBar: function() {
			var cached_screens = methods.getScreens();
			for(var s in cached_screens) {
				if(s == 'open_app') {
					// Algo diferente para cuando se abre la pantalla por primera vez
					methods.loadFragment('.tasks-bar-commands', 'header/taskbar/link', true, {'screen': s, 'name': cached_screens[s].name});
				}
			}
		},
		openMenu: function() {
			// TODO - Mejorar funcionalidad
			if($('#nav-menu:visible').length) {
				$('#product-barcode-input').trigger('focus');
				$('#nav-menu').fadeOut('fast');
				$('#menu-section').hide('fast');
				$('#menu-section .menu-section-content').html('');
			} else {
				$('#nav-menu').fadeIn('fast');
			}
		},
		getProductsData: function(params) {
			var data = {
				page: params.page && params.page > 1 ? params.page : 1
			};
			return data;
		},
		getClientsData: function(params) {
			var data = {
				page: params.page && params.page > 1 ? params.page : 1
			};
			return data;
		},
		openMenuSection: function(params) {
			// debugFn(params);
			$('#menu-section').fadeIn('fast');
			// Set data from dataFunction if exists
			var data     = (params.dataFn != '' && typeof methods[params.dataFn] == 'function') ? methods[params.dataFn](params) : {},
				// set fragment to load (where variables will be changed by matched keys of data)
				fragment = params.section + '/' + params.template;

			// If have a model setted, and have an edit id setted, load it to edit
			methods.setLoadingTo(true, '#menu-section');
			if(params.model && params.model != '' && ((params['edit-id'] && params['edit-id'] != '') || (params['delete-id'] && params['delete-id'] != ''))) {
				methods.doRequest('GET', {'__action': params.model + '/' + (params['edit-id'] ? params['edit-id'] : params['delete-id'])}, function(response) {
					for(var r in response) {
						data[params.model + '_' + r] = response[r];
					}

					methods.loadFragment('#menu-section .menu-section-content', 'nav-menu/menu-section/' + fragment, false, data, function() {
						methods.setLoadingTo(false);
					});
				});
			} else if(params.model && params.model != '') {
				methods.doRequest('GET', {__action: params.model}, function(responseObj, status, request) {
					var listLength = responseObj.length;

					if(listLength > 20) {
						methods.doRequest('GET', {__action: params.model + '/page/' + (params.page && params.page ? params.page : '1')}, function(responseObj, status, request) {
							data.list        = responseObj;
							data.listLength  = listLength;
							data.message     = 'No se encontraron ' + params.alias;
							data.pagesLength = 0;
							data.pages       = [];

							while(data.pagesLength < Math.ceil(data.listLength / 20)) {
								data.pagesLength++
								data.pages.push(data.pagesLength);
							}

							methods.loadFragment('#menu-section .menu-section-content', 'nav-menu/menu-section/' + fragment, false, data, function() {
								methods.setLoadingTo(false);

								// TODO - Hay que mejorar el paginador desde la logica
								$('.menu-section-content .pager .pages .page').removeClass('selected');
								$('.menu-section-content .pager .pages .page-' + data.page).addClass('selected');

								var pages = $('.menu-section-content .pager .pages .page'),
									pagesLength = pages.length,
									pageSelected = $('.menu-section-content .pager .pages .page.selected'),
									indexSelected = parseInt($.trim(pageSelected.text()));

								if(pagesLength > 5) {
									if(indexSelected <= 3) {
										var hidePages = $.grep(pages, function(page, index) {
											return index > 4;
										});
										
										$(hidePages).hide();
										$('.menu-section-content .pager .pages').append($('.menu-section-content .pager .pages .page:visible:last').clone().text('...'));
									} else if(indexSelected > 3 && indexSelected < pagesLength - 2) {
										var hidePages = $.grep(pages, function(page, index) {
											return index < indexSelected - 3 || index > indexSelected + 1;
										});
										
										$(hidePages).hide();
										$('.menu-section-content .pager .pages').append($('.menu-section-content .pager .pages .page:visible:last').clone().text('...'));
										$('.menu-section-content .pager .pages').prepend($('.menu-section-content .pager .pages .page:visible:first').clone().text('...'));
									} else {
										var hidePages = $.grep(pages, function(page, index) {
											return index < pagesLength - 5;
										});
										
										$(hidePages).hide();
										$('.menu-section-content .pager .pages').prepend($('.menu-section-content .pager .pages .page:visible:first').clone().text('...'));
									}
								}
							});
						});
					} else {
						data.list        = responseObj;
						data.listLength  = data.list.length;
						data.message     = 'No se encontraron ' + params.alias;
						data.pagesLength = 0;

						methods.loadFragment('#menu-section .menu-section-content', 'nav-menu/menu-section/' + fragment, false, data, function() {
							// TODO - algo despues de mostrar la lista... o quizas nada, no se
							methods.setLoadingTo(false);
						});
					}
				});
			}
			// If does not have a model, just load and show the fragment
			else {
				methods.loadFragment('#menu-section .menu-section-content', 'nav-menu/menu-section/' + fragment, false, data, function(response, status) {
					methods.setLoadingTo(false);
				});
			}
		},
		search: function() {
			// TODO - Crear funcionalidad
		},
		loadScreen: function(screen_loaded, data, callback) {
			methods.setLoadingTo(true);
			
			$.ajax({
				method: 'get',
				url: '/screens/' + screen_loaded + '.html',
				cache: false,
				complete: function(response, status, request) {
					methods.setActive_screen(screen_loaded);
					$('#all-wrap').html(methods.fillResponse(response.responseText, data));
					if(callback && typeof callback == 'function') {
						callback(screen_loaded, response.responseText);
					}
				}
			});
		},
		loadFragment: function(target, fragment, add, data, callback) {
			methods.setLoadingTo(true, target);

			$.ajax({
				method: 'get',
				url: '/screens/fragments/' + fragment + '.html',
				cache: false,
				complete: function(response, status, request) {
					var $target = $(target || '#open-app');
					if(add) {
						methods.setLoadingTo(false, target);
						$target.append(methods.fillResponse(response.responseText, data));
					} else {
						$target.html(methods.fillResponse(response.responseText, data));
					}
					if(callback && typeof callback == 'function') {
						callback(fragment, response.responseText);
					}
				},
				error: function() {
					methods.setLoadingTo(false);
					alert('Some error occurred during loading the fragment');
				}
			});

			// $.get('/screens/fragments/' + fragment + '.html', function(response, status, request) {
			// 	var $target = $(target || '#open-app');
			// 	if(add) {
			// 		methods.setLoadingTo(false, target);
			// 		$target.append(methods.fillResponse(response, data));
			// 	} else {
			// 		$target.html(methods.fillResponse(response, data));
			// 	}
			// 	if(callback && typeof callback == 'function') {
			// 		callback(fragment, response);
			// 	}
			// }).error(function() {
			// 	methods.setLoadingTo(false, target);
			// 	alert('Some error occurred during loading the fragment');
			// });
		},
		fillResponse: function(response, data) {
			// TODO - Achicar los metodos y reutiulizar codigo
			// TODO - limpiar el response aunque no haya datos para sustituir, de esta manera mostrar
				   // un template vacio pero sin errores

			// Si tengo data
			if(data) {
				// reemplazo todas las variables estaticas {{variable}} por su valor correspondiente
				for(var d in data) {
					response = response.replaceAll('{{' + d + '}}', data[d]);
				}

				// Reemplazar las variables que no fueron reemplazadas anteriormente
				var reMV = new RegExp("\{\{(?!endif|endrepeat)[a-zA-Z]*\}\}");
				response = response.replaceAll(reMV, 'undefined');

				// TODO - Reemplazar logica dentro del template con expresiones
				var re      = new RegExp("\{\{([a-z]*)\:( |)[a-zA-Z]*( |)[^(\{\{)]*\{\{[a-z]*\}\}");
				var matches = re.exec(response);

				while(matches) {
					var blocklogic = matches[0],
						logicis    = matches[1];

					switch(logicis) {
						case 'if':
							// agarrar la expresión a evaluar
							var re2    = new RegExp("\{\{([a-z]*)\:( |)[a-zA-Z]*( |)[^(\}\})]*\}\}");
							var match2 = re2.exec(blocklogic);

							if(match2) {
								// limpio la expresion para poder evaluar
								var expression = match2[0];
									expression = expression.replace('{{if:', '');
									expression = expression.replace('}}', '');
									expression = $.trim(expression);

								// agarro la logica y la limpio dejando solo el resultado
								var blockresult = blocklogic.replaceAll(match2[0], "");
									blockresult = blockresult.replaceAll('{{endif}}','');

								// reemplazo la informacion que dependa del atributo data
								var replaced = [];
								for(var d in data) {
									if($.inArray(d, replaced) == -1) {
										var datakeyre = new RegExp("(^|\\W)" + d + "($|\\W)");

										if(datakeyre.test(expression)) {
											expression = expression.replaceAll(d, 'data.' + d);
											replaced.push(d);
										}
									}
								}
								expression = expression.replaceAll('data.data', 'data');

								// evaluar la expresion
								var expressionIsTrue;
								eval('expressionIsTrue = ' + expression + ';');

								// reemplazar el bloque por el resultado de la expresion si esta se cumple
								if(expressionIsTrue) {
									response = response.replace(blocklogic, blockresult);
								} else {
									response = response.replace(blocklogic, '');
								}
							} else {
								response = response.replace(blocklogic, '');
							}
						break;
						case 'repeat':
							// agarrar la expresión a evaluar
							var re2    = new RegExp("\{\{([a-z]*)\:( |)[a-zA-Z]*( |)[^(\}\})]*\}\}");
							var match2 = re2.exec(blocklogic);

							if(match2) {
								// limpio la expresion para poder evaluar
								var expression = match2[0];
									expression = expression.replace('{{repeat:', '');
									expression = expression.replace('}}', '');
									expression = $.trim(expression);

								// agarro la logica y la limpio dejando solo el resultado
								var blocktemplate = blocklogic.replaceAll(match2[0], "");
									blocktemplate = blocktemplate.replaceAll('{{endrepeat}}','');

								// reemplazo la informacion que dependa del atributo data
								for(var d in data) {
									expression = expression.replaceAll(d, 'data.' + d);
								}
								expression = expression.replaceAll('data.data', 'data');

								// evaluar la expresion
								var expressionResult;
								eval('expressionResult = ' + expression + ';');

								var repeatBlockHtml = '',
									iTemplate = '';

								for(var i in expressionResult) {
									iTemplate = blocktemplate;

									if(!$.isArray(expressionResult[i]) && !$.isPlainObject(expressionResult[i])) {
										iTemplate = iTemplate.replaceAll('##index##', expressionResult[i]);
									}

									if($.isPlainObject(expressionResult[i])) {
										for(var key in expressionResult[i]) {
											iTemplate = iTemplate.replaceAll('##' + key + '##', expressionResult[i][key]);
										}
									}
									repeatBlockHtml += iTemplate;
								}

								response = response.replace(blocklogic, repeatBlockHtml);
							} else {
								response = response.replace(blocklogic, '');
							}

							response = response.replace(matches[0], "Hi there");
						break;
					}

					matches = re.exec(response);
				}
			}
			response = response.replaceAll('[[rbr]]', '{');
			response = response.replaceAll('[[lbr]]', '}');
			return response;
		},
		saveProduct: function(params) {
			var $forminputs = $('#' + params.form).find('.form-input'),
				data        = {};
			
			$forminputs.each(function() {
				data[$(this).attr('id')] = $(this).val();
			});

			if(data.id && data.id != '') {
				data.__action = 'product/update/' + data.id;
			} else {
				data.__action = 'product/save';
			}

			methods.setLoadingTo(true, "#menu-section");
			methods.doRequest('POST', data, function(response, status, request) {
				methods.openMenuSection({"section": "list", "template": "articles", "model": "products", "page": "1", "dataFn": "getProductsData"});
			});
		},
		deleteProduct: function(params) {
			var data = {'__action': 'product/delete/' + params.id}

			methods.setLoadingTo(true, "#menu-section");
			methods.doRequest('GET', data, function(response, status, request) {
				methods.openMenuSection({"section": "list", "template": "articles", "model": "products", "page": "1", "dataFn": "getProductsData"});
			});
		},
		getProductByBarcode: function(barcode) {
			return methods.doRequest('GET', {__action: 'product/barcode/' + barcode});
		},
		saveClient: function(params) {
			var $forminputs = $('#' + params.form).find('.form-input'),
				data        = {};
			
			$forminputs.each(function() {
				data[$(this).attr('id')] = $(this).val();
			});

			if(data.id && data.id != '') {
				data.__action = 'client/update/' + data.id;
			} else {
				data.__action = 'client/save';
			}

			methods.setLoadingTo(true, "#menu-section");
			methods.doRequest('POST', data, function(response, status, request) {
				methods.openMenuSection({"section": "list", "template": "clients", "model": "clients", "page": "1", "dataFn": "getClientsData"});
			});
		},
		deleteClient: function(params) {
			var data = {'__action': 'client/delete/' + params.id}

			methods.setLoadingTo(true, "#menu-section");
			methods.doRequest('GET', data, function(response, status, request) {
				methods.openMenuSection({"section": "list", "template": "clients", "model": "clients", "page": "1", "dataFn": "getClientsData"});
			});
		},
		resetForm: function(params) {
			// TODO - Reset form *general
		},
		bindEvents: function() {
			$(document).on('ready', function() {
				$('body').on('click', 'a', function(e) {
					if($(this).attr('href') != '' && $(this).attr('href') != '#') {
						return true;
					}
					e.preventDefault();
					e.stopPropagation();
					if($(this).data('action')) {
						var params = $(this).data('params') || null;
						methods[$(this).data('action')](params);
					}
				});

				$('body').on('click', '#nav-menu, #menu-section', function(e) {
					e.stopPropagation();
					return false;
				});

				$('body').on('click', '.context-card .pay-actions .user-document-input', function(e) {
					e.preventDefault();
					e.stopPropagation();
				});

				$('body').on('click', '.context-card .ticket-amount .amount-cash', function(e) {
					e.preventDefault();
					e.stopPropagation();
				});

				$(document).on('click contextmenu', function(e) {
					if(e.which == 2 || e.which == 3) {
						e.preventDefault();
						return false;
					}
					if($('#nav-menu:visible').length) {
						$('#nav-menu').fadeOut('fast');
					}
				});

				methods.barcodeEvents();
			});
		},
		barcodeEvents: function() {
			if(!$('#product-barcode-input').length) {
				setTimeout(function() { methods.barcodeEvents(); }, 100);
				return;
			}
			$('#product-barcode-input').val('');
			$('#product-barcode-input').trigger('focus');
			$('#product-barcode-fix').on('focus', function() {
				$('#product-barcode-input').trigger('focus');
			});
			$('#product-barcode-input').on('keydown keypress keyup', function(e) {
				if($('#product-barcode-input').val() != '') {
					$('.product-barcode').addClass('active');
				} else {
					$('.product-barcode').removeClass('active');
				}
				$('#product-barcode').text($(this).val());
			});
			$('#product-barcode-input').on('keypress', function(e) {
				switch(e.which) {
					case 13:
						var barcode = $('#product-barcode-input').val();

						if($.trim(barcode) == '') {
							$('#product-barcode-input').val('');
							return false;
						}


						methods.setLoadingTo(true, '.current-ticket.context-card');
						var product = methods.getProductByBarcode(barcode);

						product.error(function() {
							methods.setLoadingTo(false, '.current-ticket.context-card');
							alert("El artículo con el código de barras " + barcode + " no se pudo localizar");
						});

						product.complete(function(response) {
							methods.setLoadingTo(false, '.current-ticket.context-card');
							if(response.responseText != 'null') {
								$('#product-barcode-input').val('');
								$('#product-barcode').removeClass('active');

								var productObj = JSON.parse(response.responseText);
								methods.addProductToTheTicket(productObj);
							} else {
								alert("El artículo con el código de barras " + barcode + " no se pudo localizar");
							}
						});
					break;
				}
			});
			// });
			$(document).on('click', function() {
				$('#product-barcode-input').trigger('focus');
			});
		},
		addProductToTheTicket: function(product) {
			var ticket = methods.getTicket();

			if(!ticket) {
				ticket = {
					products: null,
					subtotal: 0,
					discount: 0,
					taxes   : 0,
					total   : 0
				};
			}

			if(!ticket.products) {
				ticket.products = [];
			}

			ticket.subtotal += parseFloat(product.sell_price) * .88;
			ticket.taxes    += parseFloat(product.sell_price) * .22;
			ticket.total    += parseFloat(product.sell_price);
			ticket.products.push(product);
			methods.setTicket(ticket);
			methods.showTicketCommands(true);

			// TODO mostrar el ticket donde va
			// methods.loadFragment(target, fragment, add, data, callback);
			// debugFn(methods.getTicket());
			methods.loadTicket();
		},
		showTicketCommands: function(show) {
			if(show) {
				$('.ticket-context .context-card .context-commands').addClass('vislbe');
				$('.product-barcode').addClass('up');
			} else {
				$('.ticket-context .context-card .context-commands').removeClass('vislbe');
				$('.product-barcode').removeClass('up');
			}
		},
		loadTicket: function(some) {
			var globalTicket = methods.getTicket(),
				ticket       = {};

			if(globalTicket) {
				ticket       = {
					itemsInTicketLenght: globalTicket.products.length,
					itemsInTicket      : globalTicket.products,
					ticketSubTotal     : parseFloat(globalTicket.subtotal).toFixed(2),
					ticketDiscount     : parseFloat(globalTicket.discount).toFixed(2),
					ticketTaxes        : parseFloat(globalTicket.taxes).toFixed(2),
					ticketTotal        : parseFloat(globalTicket.total).toFixed(2)
				};

				for(var i in ticket.itemsInTicket) {
					// ticket.itemsInTicket[i].sell_price = parseFloat(ticket.itemsInTicket[i].sell_price).toFixed(2);
					// ticket.itemsInTicket.
				}
			} else {
				ticket       = {
					itemsInTicketLenght: 0,
					itemsInTicket      : [],
					ticketSubTotal     : 0,
					ticketDiscount     : 0,
					ticketTaxes        : 0,
					ticketTotal        : 0
				};
			}

			methods.loadFragment('.ticket-wrapper', 'transaction/ticket-content', false, ticket);
		},
		closeCard: function(params) {
			$('.' + params['card-name'] + '.context-card').removeClass('visible');
		},
		closeCards: function(params) {
			$('.context-card').removeClass('visible');
		},
		deleteLastItem: function(params) {
			var ticket      = methods.getTicket(),
				lastProduct = null;

			if(!ticket || !ticket.products.length) {
				return;
			}

			lastProduct      = ticket.products[ticket.products.length -1];
			ticket.subtotal -= parseFloat(lastProduct.sell_price) * .88;
			ticket.taxes    -= parseFloat(lastProduct.sell_price) * .22;
			ticket.total    -= parseFloat(lastProduct.sell_price);
			ticket.products.pop();

			methods.setTicket(ticket);
			methods.loadTicket();

			if(!ticket.products.length) {
				methods.showTicketCommands(false);
			}

			$('#product-barcode-input').trigger('focus');
		},
		deleteItem: function(params) {
			var ticket        = methods.getTicket(),
				itemsInTicket = ticket.products,
				itemToRemove  = null,
				indexToRemove = null;

			$.each(itemsInTicket, function(index, item) {
				if(item.id == params.id) {
					itemToRemove  = item;
					indexToRemove = index;
					return false;
				}
			});

			ticket.subtotal -= parseFloat(itemToRemove.sell_price) * .88;
			ticket.taxes    -= parseFloat(itemToRemove.sell_price) * .22;
			ticket.total    -= parseFloat(itemToRemove.sell_price);
			ticket.products.splice(indexToRemove, 1);

			methods.setTicket(ticket);
			methods.closeCard({'card-name': 'edit-item'});
			methods.loadTicket();

			if(!ticket.products.length) {
				methods.showTicketCommands(false);
			}

			$('#product-barcode-input').trigger('focus');
		},
		cancelTicket: function(params) {
			var ticket = methods.getTicket();
			if(!ticket || !ticket.products.length) {
				return;
			}
			methods.setTicket(null);
			methods.loadTicket();
			methods.closeCards();
			methods.showTicketCommands(false);
			$('#product-barcode-input').trigger('focus');
		},
		showItemToEdit: function(params) {
			// mostrar la pantalla para el producto
			$('.edit-item.context-card').addClass('visible');
			// Poner loading
			methods.setLoadingTo(true, '.edit-item.context-card');
			// cargar el producto
			var product = methods.doRequest('GET', {__action: 'product/' + params.id});
			// mostrar el producto
			product.complete(function(response) {
				if(response && response != '' && response != null) {
					var responseObj = JSON.parse(response.responseText);
					methods.loadFragment('.edit-item.context-card', 'transaction/contexts/item-edit', false, responseObj, function() {
						methods.setLoadingTo(false);
					});
				} else {
					alert('No se encontró ningún item');
					methods.setLoadingTo(false);
				}
			});
		},
		continueToPay: function(params) {
			// obtengo el resumen del ticket
			var ticket = methods.getTicket();
			if(!ticket || !ticket.products.length) {
				alert('El ticket está vacío');
				return;
			}
			// Muestro la pantalla con el resumen para pagar
			$('.pay-ticket.context-card').addClass('visible');
			// Loading...
			methods.setLoadingTo(true, '.pay-ticket.context-card');
			// Muestro el resumen del ticket

			ticket.subtotal = parseFloat(ticket.subtotal).toFixed(2);
			ticket.discount = parseFloat(ticket.discount).toFixed(2);
			ticket.taxes    = parseFloat(ticket.taxes).toFixed(2);
			ticket.total    = parseFloat(ticket.total).toFixed(2);

			methods.loadFragment('.pay-ticket.context-card', 'transaction/contexts/pay-ticket', false, ticket, function() {
				methods.setLoadingTo(false);
			});
		},
		saveTicket: function(params) {
			// Obtengo el ticket
			var ticket = methods.getTicket();
			// Loading...
			methods.setLoadingTo(true, '.pay-ticket.context-card');
			// Envio el ticket al servidor
			return methods.doRequest('POST', {__action: 'transaction/save', ticket: ticket}, function(response, status, request) {
				methods.setLoadingTo(false);
				// Limpio el ticket actual
				if(params) {
					if(params['close-ticket']) {
						methods.setTicket(null);
						methods.closeCard({'card-name': 'pay-ticket'});
					}
				}
				methods.loadTicket();
			});
		},
		payWithCreditCard: function(params) {
			var ticket      = methods.getTicket(),
				ticketSaved = null;

			if(!ticket || !ticket.products.length) {
				alert('No es posible realizar un pago');
				return;
			}

			ticket.total      = parseFloat(ticket.total).toFixed(2);
			ticket.pay_type   = '';
			ticket.pay_amount = 0;
			ticket.pay_change = 0;
			methods.setTicket(ticket);
			ticketSaved       = methods.saveTicket();

			// Loading...
			methods.setLoadingTo(true, '.pay-with-credit.context-card');
			ticketSaved.success(function(response) {
				var dataSaved       = JSON.parse(response),
					auxProducts     = ticket.products;
					ticket          = dataSaved.transaction;
					ticket.products = auxProducts

				methods.setTicket(ticket);

				// Muestro la pantalla con el resumen para pagar
				$('.pay-with-credit.context-card').addClass('visible');
				// Muestro el resumen del ticket
				methods.loadFragment('.pay-with-credit.context-card', 'transaction/contexts/pay-with-credit', false, {total: ticket.total, id: dataSaved.transactionId}, function() {
					methods.setLoadingTo(false);
				});
			});
		},
		payWithCash: function(params) {
			// TODO unificar funciones de payWith cash and pay with credit, son casi idénticas
			var ticket      = methods.getTicket(),
				ticketSaved = null;

			if(!ticket || !ticket.products.length) {
				alert('No es posible realizar un pago');
				return;
			}

			ticket.total      = parseFloat(ticket.total).toFixed(2);
			ticket.pay_type   = '';
			ticket.pay_amount = 0;
			ticket.pay_change = 0;
			methods.setTicket(ticket);
			ticketSaved       = methods.saveTicket();

			// Loading...
			methods.setLoadingTo(true, '.pay-with-cash.context-card');
			ticketSaved.success(function(response) {
				var dataSaved       = JSON.parse(response),
					auxProducts     = ticket.products;
					ticket          = dataSaved.transaction;
					ticket.products = auxProducts

				methods.setTicket(ticket);

				// Muestro la pantalla con el resumen para pagar
				$('.pay-with-cash.context-card').addClass('visible');
				// Muestro el resumen del ticket
				methods.loadFragment('.pay-with-cash.context-card', 'transaction/contexts/pay-with-cash', false, {total: ticket.total, id: dataSaved.transactionId}, function() {
					methods.setLoadingTo(false);
					setTimeout(function() {
						$('.context-card .ticket-amount .amount-cash').trigger('focus');
					}, 100);
				});
			});
		},
		addClientToTicket: function(params) {
			// TODO obtener cliente por ci de la api
			// Agarro la ci
			var clientDocument = $('.user-document-input').val();

			if(!clientDocument || $.trim(clientDocument) == '') {
				alert('Ingrese un documento de identidad válido');
				return;
			}

			methods.setLoadingTo(true, '.pay-with-credit.context-card');
			var client         = methods.doRequest('GET', {__action: 'client/bydocument/' + clientDocument});
			client.success(function(response) {
				methods.setLoadingTo(false);
				if(JSON.parse(response)) {
					var clientObj = JSON.parse(response);
					$('.pay-actions .client-name').html('<span class="client-name-value">' + clientObj.first_name + ' ' + clientObj.last_name + '</span><span class="transaction-client-actions"><a href="#" data-action="removeClient" class="fa fa-remove"></a><a href="#" data-action="saveClientToTicket" data-params=\'{"clientid": "' + clientObj.id + '", "ticketId": "' + params.ticketId + '"}\' class="fa fa-check"></a></span>');
				} else {
					alert('No se encontró ningún cliente con documento ' + clientDocument);
				}
			});
		},
		removeClient: function(params) {
			$('.pay-actions .client-name').html('');
		},
		saveClientToTicket: function(params) {
			methods.setLoadingTo(true, '.pay-with-credit.context-card');
			methods.doRequest('POST', {__action: '/transaction/' + params.ticketId + '/update-client', clientid: params.clientid}, function(response) {
				methods.setLoadingTo(false);
				$('.pay-actions .client-add-form').hide();
				$('.pay-actions .client-name').prepend('Cliente: ');
				$('.pay-actions .client-name').find('.transaction-client-actions').remove();
			});
		},
		completePay: function(params) {
			var ticket      = methods.getTicket(),
				paywith     = params['pay-with'],
				amount      = paywith == 'cash'
								? !isNaN(parseFloat($('.context-card .ticket-amount .amount-cash').val()))
									? parseFloat($('.context-card .ticket-amount .amount-cash').val())
									: 0.00
								: parseFloat(ticket.total);

			// Agrego los nuevos valores al ticket
			ticket.total      = parseFloat(ticket.total);
			ticket.pay_type   = paywith;
			ticket.pay_amount = amount;
			ticket.pay_change = amount - ticket.total;

			if(!ticket || !ticket.products.length) {
				alert('No es posible realizar un pago');
				return;
			}

			if(paywith == 'cash' && amount <= 0 || amount < ticket.total) {
				alert('Debe ingresar un monto superior al total de la trasacción');
				return;
			}

			ticket.total      = ticket.total.toFixed(2);
			ticket.pay_amount = ticket.pay_amount.toFixed(2);
			ticket.pay_change = ticket.pay_change.toFixed(2);

			methods.setTicket(ticket);
			methods.setLoadingTo(true, '.pay-with-' + (paywith == 'cash' ? 'cash' : 'credit')  + '.context-card');
			methods.doRequest('POST', {__action: 'transaction/pay/' + params.ticketId, 'transaction': ticket}, function() {
				methods.ticketPayed();
			});
		},
		ticketPayed: function() {
			// TODO
			var ticket = methods.getTicket();
				ticket.pay_type_human_readable = (ticket.pay_type == 'cash' 
													? 'Efectivo'
													: (ticket.pay_type == 'credit_card'
														? 'Crédito/Débito'
														: ''));

			debugFn(ticket);

			methods.setLoadingTo(true, '.pay-with-' + (ticket.pay_type == 'cash' ? 'cash' : 'credit')  + '.context-card');
			methods.loadFragment('.end-ticket.context-card', 'transaction/contexts/end-ticket', false, ticket, function() {
				methods.setLoadingTo(false);
				$('.end-ticket.context-card').addClass('visible');
			});
		},
		doRequest: function(method, data, callback) {
			data.__method = method;
			return $.ajax({
				method: method,
				url: '/gateway/index.php',
				data: data,
				cache: false,
				complete: function(response, status, request) {
					var responseObj = JSON.parse(response.responseText);
					if(callback && typeof callback == 'function') {
						callback(responseObj, status, request);
					}
				}
			});
		},
		setLoadingTo: function(show, target) {
			var $t = target ? $(target) : $('#all-wrap');
			if(show) {
				$t.append('<div id="loading_' + $t.attr('id') + '" class="loading"><div class="loader"><span class="fa fa-spin fa-circle-o-notch"></span></div></div>')
			} else {
				$t.find('.loading').remove();
			}
		}
	}

	// app ignition
	methods.init();

	// publics
	return {
		getCurrentUser: function() {
			return methods.getUser();
		},
		getAppStatus: function() {
			return methods.getApp_status();
		},
		getAppProps: function() {
			return properties;
		}
	}
})();
})(jQuery, window, document);




// Global Scope
// window.app_beta = (function(init) {
// 	// variables privadas
// 	var logged         = false,
// 		loginToken     = null,
// 		currentCompany = null,
// 		currentUser    = null,
// 		currentTicket  = null,
// 		usuarios       = [],
// 		clientes       = [],
// 		productos      = [],
// 		transacciones  = [];

// 	// métodos privados
// 	/* Funciones de almacenamiento y recuperación */
// 	// Esta funcion guarda todo el estado de la aplicación el el storage del cliente
// 	function saveAppStatus() {
// 		saveInStorage('logged', 'boolean', logged);
// 		saveInStorage('loginToken', 'string', loginToken);
// 		saveInStorage('currentCompany', 'object', currentCompany);
// 		saveInStorage('currentUser', 'object', currentUser);
// 		saveInStorage('currentTicket', 'object', currentTicket);

// 		// Aqui se guardan los modelos de datos que para la demo son temporales
// 		saveInStorage('usuarios', 'array', window.usuarios);
// 		saveInStorage('clientes', 'array', window.clientes);
// 		saveInStorage('productos', 'array', window.productos);
// 		saveInStorage('empresas', 'array', window.empresas);
// 		saveInStorage('transacciones', 'array', window.transacciones);
// 	}
// 	function restoreAppStatus() {
// 		logged         = getFromStorage('logged') || false;
// 		loginToken     = getFromStorage('loginToken') || null;
// 		currentCompany = getFromStorage('currentCompany') || null;
// 		currentUser    = getFromStorage('currentUser') || null;
// 		currentTicket  = getFromStorage('currentTicket') || null;

// 		// Aqui se recuperan los modelos de datos que para la demo son temporales
// 		window.usuarios      = getFromStorage('usuarios') || window.usuarios;
// 		window.clientes      = getFromStorage('clientes') || window.clientes;
// 		window.productos     = getFromStorage('productos') || window.productos;
// 		window.empresas      = getFromStorage('empresas') || window.empresas;
// 		window.transacciones = getFromStorage('transacciones') || window.transacciones;

// 		setUsuariosFromApi();
// 		setClientesFromApi();
// 		setProductosFromApi();
// 		setTransaccionesFromApi();
// 	}
// 	function resetAppStatus() {
// 		logged         = false;
// 		loginToken     = null;
// 		currentCompany = null;
// 		currentUser    = null;
// 		currentTicket  = null;
// 		usuarios       = [];
// 		clientes       = [];
// 		productos      = [];
// 	}
// 	function deleteAppStatus() {
// 		localStorage.clear();
// 	}
// 	function saveInStorage(key, type, value) {
// 		// stringify type
// 		switch(type) {
// 			case 'string':
// 			case 'number':
// 			case 'float':
// 			case 'boolean':
// 			value = value;
// 			break;
// 			case 'object':
// 			case 'array':
// 			value = JSON.stringify(value);
// 			break;
// 		}

// 		localStorage.setItem(key, value);
// 		localStorage.setItem(key + '_type', type);
// 	}
// 	function getFromStorage(key) {
// 		var storeKeyValue = localStorage.getItem(key);
// 		var storeKeyType  = localStorage.getItem(key + '_type');

// 		// parse type
// 		switch(storeKeyType) {
// 			case 'string':
// 			storeKeyValue = storeKeyValue;
// 			break;
// 			case 'number':
// 			storeKeyValue = parseInt(storeKeyValue);
// 			break;
// 			case 'float':
// 			storeKeyValue = parseFloat(storeKeyValue);
// 			break;
// 			case 'boolean':
// 			storeKeyValue = storeKeyValue == 'true' ? true : false;
// 			break;
// 			case 'object':
// 			storeKeyValue = JSON.parse(storeKeyValue);
// 			break;
// 			case 'array':
// 			storeKeyValue = JSON.parse(storeKeyValue);
// 			break;
// 		}

// 		return storeKeyValue;
// 	}
// 	function removeFromStorage(key) {
// 		localStorage.removeItem(key);
// 		localStorage.removeItem(key + '_type');
// 	}
// 	/* Fin de funciones de almacenamiento y recuperación */

// 	function setLoggedIn(islogged) {
// 		logged = islogged;
// 	}

// 	function isLoggedIn() {
// 		return logged;
// 	}

// 	function setCurrentUser(user) {
// 		currentUser = user;
// 	}

// 	function getCurrentUser() {
// 		return currentUser;
// 	}

// 	function getCurrentUserRole() {
// 		var role = null;
// 		$.each(roles, function(r, rol) {
// 			if(rol.id == currentUser.idRol) {
// 				role = rol.rol;
// 				return false;
// 			}
// 		});
// 		return role;
// 	}

// 	function getCurrentCompany() {
// 		return currentCompany;
// 	}

// 	function setCurrentCompany(company) {
// 		currentCompany = company;
// 	}

// 	/* Usuarios */
// 	function getUsuarios() {
// 		return usuarios;
// 	}

// 	function getUsuario(id) {
// 		var _usuario_ = null;
// 		$.each(usuarios, function(i, usuario) {
// 			if(usuario.id == id && usuario.idEmpresa == getCurrentCompany()['id']) {
// 				_usuario_ = usuario;
// 				return false;
// 			}
// 		});
// 		return _usuario_;
// 	}

// 	function setUsuariosToApi() {
// 		window.usuarios = usuarios;
// 	}

// 	function setUsuariosFromApi() {
// 		usuarios = window.usuarios;
// 		$.each(usuarios, function(i, usuario) {
// 			$.each(window.roles, function(i, rol) {
// 				if(usuario.idRol == rol.id) {
// 					usuario.rol = rol.rol;
// 				}
// 			});
// 		});
// 	}
// 	/* Fin Usuarios */
// 	/* Clientes */
// 	function getClientes() {
// 		return clientes;
// 	}

// 	function setClientes() {}

// 	function setClientesFromApi() {
// 		clientes = window.clientes;
// 	}
// 	/* Fin Clientes */
// 	/* Productos */
// 	function getProductos() {
// 		return productos;
// 	}

// 	function setProductos() {}

// 	function getProducto(codigo) {
// 		var _producto_ = null;		
// 		$.each(productos, function(i, producto) {
// 			if(producto.barcode == codigo) {
// 				_producto_ = producto;
// 				return false;
// 			}
// 		});
// 		return _producto_;
// 	}

// 	function setProductosFromApi() {
// 		productos = window.productos;
// 	}
// 	/* Fin Productos */
// 	/* Transacciones y ticket */
// 	function startTicket() {
// 		currentTicket = {
// 			productos: [],
// 			subtotal : 0,
// 			impuesto : 0,
// 			tota     : 0,
// 			addProducto: function(id) {
// 				// $.each(productos, function(i, producto) {
// 				// 	if(producto.id == id) {
// 				// 		currentTicket.productos.push(producto);
// 				// 	}
// 				// 	saveAppStatus();
// 				// 	document.location.href = document.location.href;
// 				// });
// 			}
// 		};
// 	}

// 	function getCurrentTicket() {
// 		return currentTicket;
// 	}

// 	function getProductosTicket() {
// 		return currentTicket ? currentTicket.productos : null;
// 	}

// 	function setTransaccionesFromApi() {
// 		transacciones = window.transacciones;
// 	}
// 	/* Fin Transacciones y ticket */

// 	// Chequea la existencia de un usuario
// 	function checkUserExistence(email) {
// 		// Separo el nombre de usuario (usuario@compania)
// 		// en usuario y compañía, por separado
// 		var emailUser  = email.split('@')[0],
// 			emailDom   = email.split('@')[1],
// 			// Filtro los usuarios por el nombre de usuario
// 			usersMatch = $.grep(window.usuarios, function(usuario) {
// 				return usuario.usuario == emailUser;
// 			}),
// 			// Filtro las empresas por el dominio de la compañía
// 			// el dominio de la compañía debe ser único en la base de datos
// 			// por lo que el resultado debe ser unico o vacío
// 			domsMatch  = $.grep(window.empresas, function(empresa) {
// 				return empresa.clave == emailDom;
// 			}),
// 			userMatch  = null,
// 			domMatch   = null;

// 		// Si existen usuarios con este nombre y una empresa con este dominio
// 		if(usersMatch.length && domsMatch.length) {
// 			var empresa = domsMatch[0]; // Hago esto porque el resultado de un dominio en empresas es único
// 			// Chequeo para los usuarios encontrados por nombre de usuario
// 			// el que pertenece a la empresa por el dominio
// 			$.each(usersMatch, function(u, usuario) {
// 				if(empresa.id == usersMatch[u].idEmpresa) {
// 					userMatch = usersMatch[u];
// 					domMatch  = empresa;
// 					return false;
// 				}
// 			});
// 		}
// 		// Si no existen un usuario o una empresa con estos datos
// 		else {
// 			return false;
// 		}

// 		// Si lleguó hasta aquí, es que tengo un usuario y una empresa
// 		// Asigno la empresa al usuario
// 		userMatch.empresa = domMatch;
// 		// y devuelvo el usuario
// 		return userMatch;
// 	}

// 	function checkUserPassword(usuario, pass) {
// 		return usuario.password == pass;
// 	}

// 	function saveUsuario(data) {
// 		var usuario = {};
// 		$.each(data.usuario, function(i, value) {
// 			usuario[value.name] = value.value;
// 		});

// 		if(!usuario.id) {
// 			usuario.id        = window.usuarios.length + 1;
// 			usuario.idEmpresa = getCurrentCompany()['id'];
// 			window.usuarios.push(usuario);
// 		} else {
// 			$.each(window.usuarios, function(i, _usuario_) {
// 				if(_usuario_.id == usuario.id) {
// 					if(!usuario.password || usuario.password == '') {
// 						usuario.password = window.usuarios[i].password;
// 					}

// 					if(!usuario.idRol || usuario.idRol == '') {
// 						usuario.idRol = window.usuarios[i].idRol;
// 					}

// 					window.usuarios[i] = usuario;
// 					return false;
// 				}
// 			});
// 		}
// 	}

// 	function saveCliente(data) {
// 		if(!data.id) {
// 			var cliente = {};
// 			$.each(data.cliente, function(i, value) {
// 				cliente[value.name] = value.value;
// 			});
// 			cliente.id = window.clientes.length + 1;
// 			window.clientes.push(cliente);
// 		}
// 	}

// 	function saveProducto(data) {
// 		if(!data.id) {
// 			var articulo = {};
// 			$.each(data.articulo, function(i, value) {
// 				articulo[value.name] = value.value;
// 			});
// 			articulo.id = window.productos.length + 1;

// 			window.productos.push(articulo);
// 		}
// 	}

// 	// Resultado de la app
// 	return {
// 		// variables públicas
// 		error     : false,
// 		lasterror : '',

// 		// métodos públicos
// 		saveApp: function() {
// 			saveAppStatus();
// 		},

// 		restoreApp: function() {
// 			restoreAppStatus();
// 		},

// 		deleteApp: function() {
// 			deleteAppStatus();
// 			this.redirectToLogin();
// 		},

// 		isLoggedIn: function() {
// 			return isLoggedIn();
// 		},

// 		getCurrentUser: function() {
// 			return getCurrentUser();
// 		},

// 		getCurrentUserRole: function() {
// 			return getCurrentUserRole();
// 		},

// 		getCurrentCompany: function() {
// 			return getCurrentCompany();
// 		},

// 		getUsuarios: function() {
// 			return getUsuarios();
// 		},

// 		getUsuario: function(id) {
// 			return getUsuario(id);
// 		},

// 		setUsuariosToApi: function() {
// 			setUsuariosToApi();
// 		},

// 		getClientes: function() {
// 			return getClientes();
// 		},

// 		setClientes: function() {
// 			setClientes();
// 		},

// 		getProductos: function() {
// 			return getProductos();
// 		},

// 		setProductos: function() {
// 			setProductos();
// 		},

// 		getProducto: function(codigo) {
// 			return getProducto(codigo);
// 		},

// 		checkUserExistence: function(email) {
// 			return checkUserExistence(email);
// 		},

// 		checkUserPassword: function(usuario, pass) {
// 			return checkUserPassword(usuario, pass);
// 		},

// 		login: function(email, pass) {
// 			var usuario = this.checkUserExistence(email);

// 			if(!usuario) {
// 				// Guardar error y retornar
// 				this.error     = true;
// 				this.lasterror = 'El usuario o la compañía no existen';
// 				return false;
// 			}
// 			if(!this.checkUserPassword(usuario, pass)) {
// 				// Guardar error y retornar
// 				this.error     = true;
// 				this.lasterror = 'El usuario o la contraseña son incorrectos';
// 				return false;
// 			}

// 			// Si llego aca es que no hubo error
// 			setLoggedIn(true);
// 			setCurrentUser(usuario);

// 			// Chequeo el rol antes de guardar
// 			if(this.getCurrentUserRole() != 'Administrador' && this.getCurrentUserRole() != 'Encargado') {
// 				// Guardar error y retornar
// 				this.error     = true;
// 				this.lasterror = 'El usuario no cuenta con permisos';
// 				setLoggedIn(false);
// 				setCurrentUser(null);
// 				this.saveApp();
// 				return false;
// 			}

// 			setCurrentCompany(usuario.empresa);
// 			setUsuariosFromApi();
// 			setClientesFromApi();
// 			setProductosFromApi();
// 			this.saveApp();
// 			return true;
// 		},

// 		redirectOnLogin: function() {
// 			var currentUserRole = this.getCurrentUserRole();
// 			switch(currentUserRole) {
// 				case 'Administrador':
// 					document.location.href = '/administracion/';
// 				break;
// 				case 'Encargado':
// 					document.location.href = '/activacion_de_usuario/';
// 				break;
// 			}
// 		},

// 		redirectToLogin: function() {
// 			document.location.href = '/';
// 		},

// 		logout: function() {
// 			resetAppStatus();
// 			this.saveApp();
// 			this.redirectToLogin();
// 		},

// 		saveUsuario: function(usuario) {
// 			saveUsuario({usuario: usuario});
// 			setUsuariosFromApi();
// 			this.saveApp();
// 			window.history.back();
// 		},

// 		saveCliente: function(cliente) {
// 			saveCliente({cliente: cliente});
// 			setClientesFromApi();
// 			this.saveApp();
// 			window.history.back();
// 		},

// 		saveProducto: function(articulo) {
// 			saveProducto({articulo: articulo});
// 			setProductosFromApi();
// 			this.saveApp();
// 			window.history.back();
// 		},

// 		startTicket: function() {
// 			startTicket();
// 			this.saveApp();
// 		},

// 		getCurrentTicket: function() {
// 			return getCurrentTicket();
// 		},

// 		getProductosTicket: function() {
// 			return getProductosTicket();
// 		},

// 		saveTransaccion: function(ticket) {
// 			saveTransaccion({ticket: ticket});
// 			setTransaccionesFromApi();
// 			this.saveApp();
// 		}
// 	}
// })();

// })(jQuery, window, document);