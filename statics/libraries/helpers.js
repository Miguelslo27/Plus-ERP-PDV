// Capitalize just first letter
String.prototype.capFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

// Replace all a instances with b
String.prototype.replaceAll = function(a, b) {
	return this.split(a).join(b);
}

// Get search attribute from current url
Document.prototype.getSearchAttr = function(key) {
	var search   = this.location.search.replace('?',''),
		attrsStr = search.split('&'),
		attrsObj = {};

	if(!attrsStr.length) return undefined;

	for(var a = 0; a < attrsStr.length; a++) {
		attrsObj[attrsStr[a].split('=')[0]] = attrsStr[a].split('=')[1];
	}

	if(key) {
		return attrsObj[key];
	}

	return attrsObj;
}

function debugFn(message) {
	if(debug) {
		console.log(message);
	}
}

// ERP Storage powered by variable types
window.erpStorage = (function() {
	return {
		set: function(key, type, value) {
			// stringify type
			switch(type) {
				case 'string':
				case 'number':
				case 'float':
				case 'boolean':
				value = value;
				break;
				case 'object':
				case 'array':
				value = JSON.stringify(value);
				break;
			}

			localStorage.setItem(key, value);
			localStorage.setItem(key + '_type', type);
		},
		get: function(key) {
			var storeKeyValue = localStorage.getItem(key);
			var storeKeyType  = localStorage.getItem(key + '_type');

			// parse type
			switch(storeKeyType) {
				case 'string':
				storeKeyValue = storeKeyValue;
				break;
				case 'number':
				storeKeyValue = parseInt(storeKeyValue);
				break;
				case 'float':
				storeKeyValue = parseFloat(storeKeyValue);
				break;
				case 'boolean':
				storeKeyValue = storeKeyValue == 'true' ? true : false;
				break;
				case 'object':
				storeKeyValue = JSON.parse(storeKeyValue);
				break;
				case 'array':
				storeKeyValue = JSON.parse(storeKeyValue);
				break;
			}

			return storeKeyValue;
		},
		remove: function(key) {
			localStorage.removeItem(key);
			localStorage.removeItem(key + '_type');
		},
		clearErp: function() {
			localStorage.clear();
		}
	}
})();