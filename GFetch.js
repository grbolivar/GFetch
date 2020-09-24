class GFetch {

	constructor(url) {

		//normalize url so it ends with /
		this.url = url.replace(/[\/]*$/, "/");

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

				_this[

					//Transform to camelCase
					endpoint.toLowerCase().split(/\W/).map((e, i) =>
						i == 0 ? e : e.charAt(0).toUpperCase() + e.slice(1)
					).join("")

				] = new GFetchEndpoint(endpoint, _this);

			}),

			_this
		) : _this._endpoints;
	}
}




class GFetchError extends Error {

	constructor(fetchResponse, ...params) {
		super(...params)
		this.status = fetchResponse.status;
		this.statusText = fetchResponse.statusText;
	}

	toString() {
		return this.statusText;
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
	@param {Object} cnf fetch() config obj 
	*/
	fetch(cnf) {

		let
			_this = this,
			method = cnf.method,
			params = cnf.params || "",
			body = cnf.body || null
			;

		//Notify observers
		//0 = Pending/request sent
		_this._notify(method, 0);

		//Append API's global headers & overwrite them if provided here. DO NOT modify original! Make a copy
		cnf.headers = Object.assign(
			//Auto-set request type
			{ 'X-Requested-With': 'XMLHttpRequest' },
			_this._api.headers(),
			cnf.headers || {}
		);

		//Params
		if (params && typeof params == 'object') {
			params = '?' + Object.entries(params)
				.map(([key, val]) => key + "=" + val)
				.join('&')
		}

		//Body
		if (body && typeof body == "object") {
			cnf.body = JSON.stringify(body);
			cnf.headers['Content-Type'] = 'application/json';
		}

		//console.log(fetchCnf);

		return fetch(_this._url + params, cnf)
			.then(async r => {

				//Normalize non-ok responses as exceptions
				if (!r.ok) {
					throw new GFetchError(r)
				}

				_this._notify(method, r.status || 200);

				//Auto-parse response's data
				r.data = await _this._parseResponseBody(r);

				return r
			})
			.catch(e => {
				//599 = network timeout error
				_this._notify(method, e.status || 599);
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
