class GFetch {

	constructor(url, observer) {

		//normalize url so it ends with /
		this.url = url.replace(/[\/]*$/, "/");
		this.observer = observer;

		this._endpoints = [];
		this._headers = {};
	}

	headers(map) {
		let _this = this;
		return map ? (

			Object.entries(

				//Copy-overwrite headers
				Object.assign(_this._headers, map)

			)

				//remove NULL or undefined headers
				.forEach(([key, value]) =>
					value == undefined || value == null ? delete _this._headers[key] : 1
				),

			_this
		) : _this._headers;
	}

	endpoints(array) {
		let _this = this;
		return array ? (

			//concat and remove dupes
			_this._endpoints = Array.from(new Set(_this._endpoints.concat(array))),

			array.forEach(endpoint => {
				//Avoid dupes
				if (_this[endpoint]) return;

				//Transform to camelCase
				let camelCaseName = endpoint.toLowerCase().split(/\W/).map((e, i) =>
					i == 0 ? e : e.charAt(0).toUpperCase() + e.slice(1)
				).join("");

				_this[camelCaseName] = new GFetchEndpoint(endpoint, _this);
			}),

			_this
		) : _this._endpoints;
	}
}





class GFetchEndpoint {
	constructor(name, gFetch) {
		this.name = name;
		this._api = gFetch;
		this._url = gFetch.url + name + "/";
	}

	/** 
	Allows for a more customizable request
	@param {Object} fetchCnf fetch() config obj 
	*/
	fetch(fetchCnf) {

		let
			_this = this,
			method = fetchCnf.method,
			params = fetchCnf.params || "",
			body = fetchCnf.body || null
			;

		//Notify observers
		_this._notify(method, "SENT");

		//Append API's global headers & overwrite them if provided here. DO NOT modify original! Make a copy
		fetchCnf.headers = Object.assign(
			//Auto-set request type
			{ 'X-Requested-With': 'XMLHttpRequest' },
			_this._api.headers(),
			fetchCnf.headers || {}
		);

		//Params
		if (params && typeof params == 'object') {
			params = '?' + Object.entries(params)
				.map(([key, val]) => key + "=" + val)
				.join('&')
		}

		//Body
		if (body && typeof body == "object") {
			fetchCnf.body = JSON.stringify(body);
			fetchCnf.headers['Content-Type'] = 'application/json';
		}

		//console.log(fetchCnf);

		return fetch(_this._url + params, fetchCnf)
			.then(async r => (
				_this._notify(method, "OK"),
				//Auto-parse response's data
				r.data = await _this._parseResponseBody(r),
				r
			))
			.catch(e => {
				_this._notify(method, "FAIL");
				throw e
			})
			;
	}

	/** 
	Performs a GET request
	@param {String|Object} params
	*/
	get(params) {
		return this._requestWithParams("GET", params);
	}

	/** 
	Performs a POST request
	@param {String|Object} paramsOrBody
	@param {Object} body
	*/
	post(paramsOrBody, body) {
		return this._requestWithParamsAndBody("POST", paramsOrBody, body)
	}

	/** 
	Performs a PUT request
	@param {String|Object} paramsOrBody
	@param {Object} body
	*/
	put(paramsOrBody, body) {
		return this._requestWithParamsAndBody("PUT", paramsOrBody, body)
	}

	/** 
	Performs a PATCH request
	@param {String|Object} paramsOrBody
	@param {Object} body
	*/
	patch(paramsOrBody, body) {
		return this._requestWithParamsAndBody("PATCH", paramsOrBody, body)
	}

	/** 
	Performs a DELETE request
	@param {String|Object} params
	*/
	delete(params) {
		return this._requestWithParams("DELETE", params);
	}

	_requestWithParams(method, params) {
		return this.fetch({ method, params });
	}

	_requestWithParamsAndBody(method, params, body) {
		if (!body) {
			body = params;
			params = null;
		}
		return this.fetch({ method, body, params });
	}

	_notify(method, status) {
		let observer = this._api.observer;
		if (observer) observer({
			endpoint: this.name,
			method,
			status
		});
	}

	async _parseResponseBody(r) {
		let data = null;
		try {
			data = await r.clone().json();
		} catch {
			try {
				data = await r.clone().text();
			} catch (e) {
				//console.log(e);
			}
		}
		return data;
	}
}