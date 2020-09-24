# GFetch v1.2.0
Tiny wrapper over fetch() for easy HTTP requests with an OOP approach, small footprint, observing capabilities and zero dependencies.

## Usage

```js
let api = new GFetch("https://my-api/")

/*
Add endpoints/resource points. Every endpoint will be appended as a property of the object
so it can be called like: api.endpoint.method(....). Endpoint names with non-word (\W)
characters will be converted to a camelCase property.
*/
.endpoints(["auth/login", "users"]) 

/*
Add headers (optional). These will be sent on every request. You can use this to add Authorization header.
*/
.headers({ "Accept-version": "3.2" });

/*
Get the endpoints and headers
*/
let endpoints = api.endpoints(); //["auth/login", "users"]
let headers = api.headers(); //{ "Accept-version": "3.2" }

/*
Add endpoints and headers later
*/
api.endpoints(["support-tickets"]).headers({ "Another-Header": "123" });

/*
Request some endpoint. On this example, this endpoint responds a valid JWT if the user
authenticates correctly. This results on this request:
POST https://my-api/auth/login/
{ data } contains the parsed response body, (eg, JSON, string, boolean or Array)
*/
api.authLogin.post({ email, pass })
.then( ({data}) => {
	//We have the JWT, set it so it's sent on every request from now on.
	//In this example {data} contains just the JWT string.
	api.headers({
		"Authorization" : "Bearer " + data; //Using Bearer schema
	});
})

/*
Request other endpoints. This results on this request:
GET https://my-api/users/?foo=bar
*/
api.users.get("?foo=bar").then(({data}) => ...);

//This results on the same request
api.users.get({ foo: "bar" }).then(({data}) => ...);

/*
Request a single user resource. Results on this request:
GET https://my-api/users/12345
*/
let uid = "12345";
api.users.get(uid).then(({data}) => ...);

/*
Set a more customizable request, eg, if you need to send headers, etc. Just pass an fetch's
config obj. The following results on this request:
POST https://my-api/users/?foo=bar&abc=1
*/
api.users.fetch({
	method: 'post',
	headers:{
		//Overwrites default set by the library
		"X-Requested-With": "Hello world", 
		//Sends this header only on this request
		"One-Time-Header": "1", 
		//Overwrites this header we set previously, but only for this request
		"Accept-version": "4.0", 
		//Overwrites the Authorization header we set previously, but only for this request
		"Authorization": "abc" 
	},
	//Sends this object on the body of the request
	body: { 
		name: "Greg",
		age: 25,
	},
	//Appends this as query string parameters to the URL
	params: {
		foo: "bar",
		abc: 1,
	}
}).then(({data}) => ...).catch( error => ... );

/*
Session ends. From now on, no Authorization header will be sent.
*/
api.headers({"Authorization": null})

```

## Observing

To observe your api's state, simply add a function. You can use this to react to the api's requests, eg., show a "busy/loading" indicator on your UI.

```js
api.observer = message => {
	console.log('API Observer: message notified', message);
};

//Stop observation by simply setting null
api.observer = null;
```

## Installing

### Via jsDelivr

```html
<script src="https://cdn.jsdelivr.net/gh/grbolivar/GFetch/GFetch.min.js"></script>
```