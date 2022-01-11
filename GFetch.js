class GFetch {

	constructor(url) {

		//normalize url so it ends with /
		this.url = url.replace(/[\/]*$/, "/");

		this._endpoints = [];
		this._headers = {};
	}

	headers(map) {
		let
			headers = this._headers,
			_Object = Object
			;
		return map ? (

			_Object.entries(

				//Copy-overwrite headers
				_Object.assign(headers, map)

			)

				//remove NULL or undefined headers
				.forEach(([key, value]) =>
					value === undefined || value === null ? delete headers[key] : 1
				),

			this

		) : headers;
	}

	endpoints(array) {
		let _this = this;
		return array ? (

			//concat and remove dupes
			_this._endpoints = [...new Set(_this._endpoints.concat(array))],

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
		this.response = fetchResponse;
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
			route = cnf.route || "",
			params = cnf.params || "",
			body = cnf.body,
			bodyType = cnf.bodyType || "json"
			;

		//Notify observers
		//0 = Pending/request sent
		_this._notify(method, 0);

		//Headers. Global API headers will be overwritten with requests headers
		cnf.headers = {
			..._this._api.headers(),
			...cnf.headers,
			'X-Requested-With': 'XMLHttpRequest',
		};

		//Params
		if (typeof params == 'object') {
			params = '?' + Object.entries(params)
				//Filter out empty values
				.filter(([key, val]) => val != null && val !== "")
				.map(([key, val]) => (
					//Query-to-mongo support for query operators
					key.match(/[=><!]\s*$/) ? key : (key + "=")
				) + val)
				.join('&')
		}

		//Automatic JSON Body
		if (typeof body == "object" && bodyType == "json") {
			cnf.body = JSON.stringify(body);
			cnf.headers['Content-Type'] = 'application/json';
		} else {
			cnf.body = body
		}

		console.log(JSON.stringify(cnf, null, 4));

		return fetch(_this._url + route + params, cnf)
			.then(async r => {

				//Normalize non-ok responses as exceptions a la axios
				if (!r.ok) {
					throw new GFetchError(r)
				}

				_this._notify(method, r.status || 200);

				//Auto-parse response's data
				r.data = await _this._parseResponseBody(r);

				return r
			})
			.catch(e => {
				console.log("fetch error: " + JSON.stringify(e));
				//599 = network timeout error
				_this._notify(method, e.status || 599);
				//Propagate exception
				throw e
			})
			;
	}

	/** 
	Performs a GET request
	@param {String|Object} params
	*/
	get(paramsOrRoute, params) {
		return this._requestWithParams("GET", paramsOrRoute, params);
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
	delete(paramsOrRoute, params) {
		return this._requestWithParams("DELETE", paramsOrRoute, params);
	}

	_requestWithParams(method, route, params) {
		if (typeof route == 'object') {
			params = route
			route = null
		}
		return this.fetch({ method, route, params });
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

	//Try to parse JSON first, then text
	async _parseResponseBody(r) {
		let data = null;
		try {
			data = await r.clone().json();
		} catch {
			try {
				data = await r.clone().text();
			} catch (e) {
				console.log(e);
			}
		}
		return data;
	}
}
