const e=(e,t=document)=>[...t.querySelectorAll(e)],t=(e,t=document)=>{const r=(new XPathEvaluator).createExpression(e).evaluate(t,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE),n=[];for(let e=0,{snapshotLength:t}=r;e<t;e++)n.push(r.snapshotItem(e));return n},r="object"==typeof self?self:globalThis,n=e=>((e,t)=>{const n=(t,r)=>(e.set(r,t),t),s=o=>{if(e.has(o))return e.get(o);const[a,i]=t[o];switch(a){case 0:case-1:return n(i,o);case 1:{const e=n([],o);for(const t of i)e.push(s(t));return e}case 2:{const e=n({},o);for(const[t,r]of i)e[s(t)]=s(r);return e}case 3:return n(new Date(i),o);case 4:{const{source:e,flags:t}=i;return n(new RegExp(e,t),o)}case 5:{const e=n(new Map,o);for(const[t,r]of i)e.set(s(t),s(r));return e}case 6:{const e=n(new Set,o);for(const t of i)e.add(s(t));return e}case 7:{const{name:e,message:t}=i;return n(new r[e](t),o)}case 8:return n(BigInt(i),o);case"BigInt":return n(Object(BigInt(i)),o)}return n(new r[a](i),o)};return s})(new Map,e)(0),s="",{toString:o}={},{keys:a}=Object,i=e=>{const t=typeof e;if("object"!==t||!e)return[0,t];const r=o.call(e).slice(8,-1);switch(r){case"Array":return[1,s];case"Object":return[2,s];case"Date":return[3,s];case"RegExp":return[4,s];case"Map":return[5,s];case"Set":return[6,s]}return r.includes("Array")?[1,r]:r.includes("Error")?[7,r]:[2,r]},c=([e,t])=>0===e&&("function"===t||"symbol"===t),l=(e,{json:t,lossy:r}={})=>{const n=[];return((e,t,r,n)=>{const s=(e,t)=>{const s=n.push(e)-1;return r.set(t,s),s},o=n=>{if(r.has(n))return r.get(n);let[l,u]=i(n);switch(l){case 0:{let t=n;switch(u){case"bigint":l=8,t=n.toString();break;case"function":case"symbol":if(e)throw new TypeError("unable to serialize "+u);t=null;break;case"undefined":return s([-1],n)}return s([l,t],n)}case 1:{if(u)return s([u,[...n]],n);const e=[],t=s([l,e],n);for(const t of n)e.push(o(t));return t}case 2:{if(u)switch(u){case"BigInt":return s([u,n.toString()],n);case"Boolean":case"Number":case"String":return s([u,n.valueOf()],n)}if(t&&"toJSON"in n)return o(n.toJSON());const r=[],f=s([l,r],n);for(const t of a(n))!e&&c(i(n[t]))||r.push([o(t),o(n[t])]);return f}case 3:return s([l,n.toISOString()],n);case 4:{const{source:e,flags:t}=n;return s([l,{source:e,flags:t}],n)}case 5:{const t=[],r=s([l,t],n);for(const[r,s]of n)(e||!c(i(r))&&!c(i(s)))&&t.push([o(r),o(s)]);return r}case 6:{const t=[],r=s([l,t],n);for(const r of n)!e&&c(i(r))||t.push(o(r));return r}}const{message:f}=n;return s([l,{name:u,message:f}],n)};return o})(!(t||r),!!t,new Map,n)(e),n},{parse:u,stringify:f}=JSON,p={json:!0,lossy:!0};var d=Object.freeze({__proto__:null,parse:e=>n(u(e)),stringify:e=>f(l(e,p))});const h="0811fd41-1b6b-49f1-8344-96210ac283f1",g="M"+h,y="T"+h;var w=e=>({value:new Promise((t=>{let r=new Worker("data:application/javascript,onmessage%3D(%7Bdata%3Ab%7D)%3D%3E(Atomics.wait(b%2C0)%2CpostMessage(0))");r.onmessage=t,r.postMessage(e)}))})
/*! (c) Andrea Giammarchi - ISC */;const{Int32Array:m,Map:b,SharedArrayBuffer:v,Uint16Array:S}=globalThis,{BYTES_PER_ELEMENT:A}=m,{BYTES_PER_ELEMENT:E}=S,{isArray:$}=Array,{notify:P,wait:M,waitAsync:k}=Atomics,{fromCharCode:j}=String,_=(e,t)=>e?(k||w)(t,0):(M(t,0),{value:{then:e=>e()}}),O=new WeakSet,T=new WeakMap;let x=0;const W=(e,{parse:t,stringify:r,transform:n}=JSON)=>{if(!T.has(e)){const s=(t,...r)=>e.postMessage({[h]:r},{transfer:t});T.set(e,new Proxy(new b,{has:(e,t)=>"string"==typeof t&&!t.startsWith("_"),get:(r,o)=>"then"===o?null:(...r)=>{const a=x++;let i=new m(new v(A)),c=[];O.has(r.at(-1)||c)&&O.delete(c=r.pop()),s(c,a,i,o,n?r.map(n):r);const l=e!==globalThis;return _(l,i).value.then((()=>{const e=i[0];if(!e)return;const r=E*e;return i=new m(new v(r+r%A)),s([],a,i),_(l,i).value.then((()=>t(j(...new S(i.buffer).slice(0,e)))))}))},set(t,n,s){if(!t.size){const n=new b;e.addEventListener("message",(async e=>{const s=e.data?.[h];if($(s)){e.stopImmediatePropagation();const[o,a,...i]=s;if(i.length){const[e,s]=i;if(!t.has(e))throw new Error(`Unsupported action: ${e}`);{const i=await t.get(e)(...s);if(void 0!==i){const e=r(i);n.set(o,e),a[0]=e.length}}}else{const e=n.get(o);n.delete(o);for(let t=new S(a.buffer),r=0;r<e.length;r++)t[r]=e.charCodeAt(r)}P(a,0)}}))}return!!t.set(n,s)}}))}return T.get(e)};W.transfer=(...e)=>(O.add(e),e);const R="object",F="function",B="number",L="string",I="undefined",J="symbol",{defineProperty:H,getOwnPropertyDescriptor:C,getPrototypeOf:N,isExtensible:D,ownKeys:U,preventExtensions:z,set:q,setPrototypeOf:Q}=Reflect,{assign:X,create:Y}=Object,G=N(Int8Array),K="isArray",V=(e,t)=>{const{get:r,set:n,value:s}=e;return r&&(e.get=t(r)),n&&(e.set=t(n)),s&&(e.value=t(s)),e},Z=(e,t)=>[e,t],ee=e=>t=>{const r=typeof t;switch(r){case R:if(null==t)return Z("null",t);if(t===globalThis)return Z(R,null);case F:return e(r,t);case"boolean":case B:case L:case I:case"bigint":return Z(r,t);case J:if(te.has(t))return Z(r,te.get(t))}throw new Error(`Unable to handle this ${r} type`)},te=new Map(U(Symbol).filter((e=>typeof Symbol[e]===J)).map((e=>[Symbol[e],e]))),re=e=>{for(const[t,r]of te)if(r===e)return t};function ne(){return this}const se="apply",oe="construct",ae="defineProperty",ie="deleteProperty",ce="get",le="getOwnPropertyDescriptor",ue="getPrototypeOf",fe="has",pe="isExtensible",de="ownKeys",he="preventExtensions",ge="set",ye="setPrototypeOf",we="delete";var me=((e,t)=>{const r=t&&new WeakMap;if(t){const{addEventListener:e}=EventTarget.prototype;H(EventTarget.prototype,"addEventListener",{value(t,n,...s){return s.at(0)?.invoke&&(r.has(this)||r.set(this,new Map),r.get(this).set(t,[].concat(s[0].invoke)),delete s[0].invoke),e.call(this,t,n,...s)}})}const n=t&&(e=>{const{currentTarget:t,target:n,type:s}=e;for(const o of r.get(t||n)?.get(s)||[])e[o]()});return(r,s,o,...a)=>{let i=0;const c=new Map,l=new Map,{[o]:u}=r,f=a.length?X(Y(globalThis),...a):globalThis,p=ee(((e,t)=>{if(!c.has(t)){let e;for(;l.has(e=i++););c.set(t,e),l.set(e,t)}return Z(e,c.get(t))})),d=new FinalizationRegistry((e=>{u(we,Z(L,e))})),h=([e,r])=>{switch(e){case R:if(null==r)return f;if(typeof r===B)return l.get(r);if(!(r instanceof G))for(const e in r)r[e]=h(r[e]);return r;case F:if(typeof r===L){if(!l.has(r)){const e=function(...e){return t&&e.at(0)instanceof Event&&n(...e),u(se,Z(F,r),p(this),e.map(p))},s=new WeakRef(e);l.set(r,s),d.register(e,r,s)}return l.get(r).deref()}return l.get(r);case J:return re(r)}return r},g={[se]:(e,t,r)=>p(e.apply(t,r)),[oe]:(e,t)=>p(new e(...t)),[ae]:(e,t,r)=>p(H(e,t,r)),[ie]:(e,t)=>p(delete e[t]),[ue]:e=>p(N(e)),[ce]:(e,t)=>p(e[t]),[le]:(e,t)=>{const r=C(e,t);return r?Z(R,V(r,p)):Z(I,r)},[fe]:(e,t)=>p(t in e),[pe]:e=>p(D(e)),[de]:e=>Z(R,U(e).map(p)),[he]:e=>p(z(e)),[ge]:(e,t,r)=>p(q(e,t,r)),[ye]:(e,t)=>p(Q(e,t)),[we](e){c.delete(l.get(e)),l.delete(e)}};return r[s]=(e,t,...r)=>{switch(e){case se:r[0]=h(r[0]),r[1]=r[1].map(h);break;case oe:r[0]=r[0].map(h);break;case ae:{const[e,t]=r;r[0]=h(e);const{get:n,set:s,value:o}=t;n&&(t.get=h(n)),s&&(t.set=h(s)),o&&(t.value=h(o));break}default:r=r.map(h)}return g[e](h(t),...r)},{proxy:r,[e.toLowerCase()]:f,[`is${e}Proxy`]:()=>!1}}})("Window",!0),be=(e=>{let t=0;const r=new Map,n=new Map,s=Symbol(),o=e=>typeof e===F?e():e,a=e=>typeof e===R&&!!e&&s in e,i=Array[K],c=ee(((e,a)=>{if(s in a)return o(a[s]);if(e===F){if(!n.has(a)){let e;for(;n.has(e=String(t++)););r.set(a,e),n.set(e,a)}return Z(e,r.get(a))}if(!(a instanceof G))for(const e in a)a[e]=c(a[e]);return Z(e,a)}));return(t,l,u)=>{const{[l]:f}=t,p=new Map,d=new FinalizationRegistry((e=>{p.delete(e),f(we,c(e))})),h=e=>{const[t,r]=e;if(!p.has(r)){const n=t===F?ne.bind(e):e,s=new Proxy(n,w),o=new WeakRef(s);p.set(r,o),d.register(s,r,o)}return p.get(r).deref()},g=e=>{const[t,r]=e;switch(t){case R:return null===r?globalThis:typeof r===B?h(e):r;case F:return typeof r===L?n.get(r):h(e);case J:return re(r)}return r},y=(e,t,...r)=>g(f(e,o(t),...r)),w={[se]:(e,t,r)=>y(se,e,c(t),r.map(c)),[oe]:(e,t)=>y(oe,e,t.map(c)),[ae]:(e,t,r)=>{const{get:n,set:s,value:o}=r;return typeof n===F&&(r.get=c(n)),typeof s===F&&(r.set=c(s)),typeof o===F&&(r.value=c(o)),y(ae,e,c(t),r)},[ie]:(e,t)=>y(ie,e,c(t)),[ue]:e=>y(ue,e),[ce]:(e,t)=>t===s?e:y(ce,e,c(t)),[le]:(e,t)=>{const r=y(le,e,c(t));return r&&V(r,g)},[fe]:(e,t)=>t===s||y(fe,e,c(t)),[pe]:e=>y(pe,e),[de]:e=>y(de,e).map(g),[he]:e=>y(he,e),[ge]:(e,t,r)=>y(ge,e,c(t),c(r)),[ye]:(e,t)=>y(ye,e,c(t))};t[u]=(e,t,s,o)=>{switch(e){case se:return g(t).apply(g(s),o.map(g));case we:{const e=g(t);r.delete(n.get(e)),n.delete(e)}}};const m=new Proxy([R,null],w),b=m.Array[K];return H(Array,K,{value:e=>a(e)?b(e):i(e)}),{[e.toLowerCase()]:m,[`is${e}Proxy`]:a,proxy:t}}})("Window");const ve=new WeakMap,Se=(e,...t)=>{const r=W(e,...t);if(!ve.has(r)){const t=e instanceof Worker?me:be;ve.set(r,t(r,g,y))}return ve.get(r)};Se.transfer=W.transfer;const{isArray:Ae}=Array,{assign:Ee,create:$e,defineProperties:Pe,defineProperty:Me,entries:ke}=Object,{all:je,resolve:_e}=new Proxy(Promise,{get:(e,t)=>e[t].bind(e)}),Oe=(e,t=location.href)=>new URL(e,t).href,Te=e=>e.arrayBuffer(),xe=e=>e.json(),We=e=>e.text(),Re=[["beforeRun","codeBeforeRunWorker"],["beforeRunAsync","codeBeforeRunWorkerAsync"],["afterRun","codeAfterRunWorker"],["afterRunAsync","codeAfterRunWorkerAsync"]];class Fe{constructor(e,t){this.interpreter=e,this.onWorkerReady=t.onWorkerReady;for(const[e,r]of Re)this[e]=t[r]?.()}get stringHooks(){const e={};for(const[t]of Re)this[t]&&(e[t]=this[t]);return e}}var Be=(...e)=>function(t,r){const n=new Worker(URL.createObjectURL(new Blob(['const e="object"==typeof self?self:globalThis,t=t=>((t,r)=>{const n=(e,r)=>(t.set(r,e),e),s=o=>{if(t.has(o))return t.get(o);const[a,i]=r[o];switch(a){case 0:case-1:return n(i,o);case 1:{const e=n([],o);for(const t of i)e.push(s(t));return e}case 2:{const e=n({},o);for(const[t,r]of i)e[s(t)]=s(r);return e}case 3:return n(new Date(i),o);case 4:{const{source:e,flags:t}=i;return n(new RegExp(e,t),o)}case 5:{const e=n(new Map,o);for(const[t,r]of i)e.set(s(t),s(r));return e}case 6:{const e=n(new Set,o);for(const t of i)e.add(s(t));return e}case 7:{const{name:t,message:r}=i;return n(new e[t](r),o)}case 8:return n(BigInt(i),o);case"BigInt":return n(Object(BigInt(i)),o)}return n(new e[a](i),o)};return s})(new Map,t)(0),r="",{toString:n}={},{keys:s}=Object,o=e=>{const t=typeof e;if("object"!==t||!e)return[0,t];const s=n.call(e).slice(8,-1);switch(s){case"Array":return[1,r];case"Object":return[2,r];case"Date":return[3,r];case"RegExp":return[4,r];case"Map":return[5,r];case"Set":return[6,r]}return s.includes("Array")?[1,s]:s.includes("Error")?[7,s]:[2,s]},a=([e,t])=>0===e&&("function"===t||"symbol"===t),i=(e,{json:t,lossy:r}={})=>{const n=[];return((e,t,r,n)=>{const i=(e,t)=>{const s=n.push(e)-1;return r.set(t,s),s},c=n=>{if(r.has(n))return r.get(n);let[l,u]=o(n);switch(l){case 0:{let t=n;switch(u){case"bigint":l=8,t=n.toString();break;case"function":case"symbol":if(e)throw new TypeError("unable to serialize "+u);t=null;break;case"undefined":return i([-1],n)}return i([l,t],n)}case 1:{if(u)return i([u,[...n]],n);const e=[],t=i([l,e],n);for(const t of n)e.push(c(t));return t}case 2:{if(u)switch(u){case"BigInt":return i([u,n.toString()],n);case"Boolean":case"Number":case"String":return i([u,n.valueOf()],n)}if(t&&"toJSON"in n)return c(n.toJSON());const r=[],f=i([l,r],n);for(const t of s(n))!e&&a(o(n[t]))||r.push([c(t),c(n[t])]);return f}case 3:return i([l,n.toISOString()],n);case 4:{const{source:e,flags:t}=n;return i([l,{source:e,flags:t}],n)}case 5:{const t=[],r=i([l,t],n);for(const[r,s]of n)(e||!a(o(r))&&!a(o(s)))&&t.push([c(r),c(s)]);return r}case 6:{const t=[],r=i([l,t],n);for(const r of n)!e&&a(o(r))||t.push(c(r));return r}}const{message:f}=n;return i([l,{name:u,message:f}],n)};return c})(!(t||r),!!t,new Map,n)(e),n},{parse:c,stringify:l}=JSON,u={json:!0,lossy:!0};var f=Object.freeze({__proto__:null,parse:e=>t(c(e)),stringify:e=>l(i(e,u))});const p="0811fd41-1b6b-49f1-8344-96210ac283f1",d="M"+p,g="T"+p;var w=e=>({value:new Promise((t=>{let r=new Worker("data:application/javascript,onmessage%3D(%7Bdata%3Ab%7D)%3D%3E(Atomics.wait(b%2C0)%2CpostMessage(0))");r.onmessage=t,r.postMessage(e)}))})\n/*! (c) Andrea Giammarchi - ISC */;const{Int32Array:y,Map:h,SharedArrayBuffer:m,Uint16Array:b}=globalThis,{BYTES_PER_ELEMENT:v}=y,{BYTES_PER_ELEMENT:S}=b,{isArray:A}=Array,{notify:P,wait:E,waitAsync:M}=Atomics,{fromCharCode:j}=String,$=(e,t)=>e?(M||w)(t,0):(E(t,0),{value:{then:e=>e()}}),_=new WeakSet,k=new WeakMap;let T=0;const x=(e,{parse:t,stringify:r,transform:n}=JSON)=>{if(!k.has(e)){const s=(t,...r)=>e.postMessage({[p]:r},{transfer:t});k.set(e,new Proxy(new h,{has:(e,t)=>"string"==typeof t&&!t.startsWith("_"),get:(r,o)=>"then"===o?null:(...r)=>{const a=T++;let i=new y(new m(v)),c=[];_.has(r.at(-1)||c)&&_.delete(c=r.pop()),s(c,a,i,o,n?r.map(n):r);const l=e!==globalThis;return $(l,i).value.then((()=>{const e=i[0];if(!e)return;const r=S*e;return i=new y(new m(r+r%v)),s([],a,i),$(l,i).value.then((()=>t(j(...new b(i.buffer).slice(0,e)))))}))},set(t,n,s){if(!t.size){const n=new h;e.addEventListener("message",(async e=>{const s=e.data?.[p];if(A(s)){e.stopImmediatePropagation();const[o,a,...i]=s;if(i.length){const[e,s]=i;if(!t.has(e))throw new Error(`Unsupported action: ${e}`);{const i=await t.get(e)(...s);if(void 0!==i){const e=r(i);n.set(o,e),a[0]=e.length}}}else{const e=n.get(o);n.delete(o);for(let t=new b(a.buffer),r=0;r<e.length;r++)t[r]=e.charCodeAt(r)}P(a,0)}}))}return!!t.set(n,s)}}))}return k.get(e)};x.transfer=(...e)=>(_.add(e),e);const O="object",F="function",W="number",R="string",B="undefined",J="symbol",{defineProperty:L,getOwnPropertyDescriptor:I,getPrototypeOf:H,isExtensible:C,ownKeys:D,preventExtensions:N,set:U,setPrototypeOf:z}=Reflect,{assign:q,create:K}=Object,Y=H(Int8Array),G="isArray",V=(e,t)=>{const{get:r,set:n,value:s}=e;return r&&(e.get=t(r)),n&&(e.set=t(n)),s&&(e.value=t(s)),e},Q=(e,t)=>[e,t],X=e=>t=>{const r=typeof t;switch(r){case O:if(null==t)return Q("null",t);if(t===globalThis)return Q(O,null);case F:return e(r,t);case"boolean":case W:case R:case B:case"bigint":return Q(r,t);case J:if(Z.has(t))return Q(r,Z.get(t))}throw new Error(`Unable to handle this ${r} type`)},Z=new Map(D(Symbol).filter((e=>typeof Symbol[e]===J)).map((e=>[Symbol[e],e]))),ee=e=>{for(const[t,r]of Z)if(r===e)return t};function te(){return this}const re="apply",ne="construct",se="defineProperty",oe="deleteProperty",ae="get",ie="getOwnPropertyDescriptor",ce="getPrototypeOf",le="has",ue="isExtensible",fe="ownKeys",pe="preventExtensions",de="set",ge="setPrototypeOf",we="delete";var ye=((e,t)=>{const r=t&&new WeakMap;if(t){const{addEventListener:e}=EventTarget.prototype;L(EventTarget.prototype,"addEventListener",{value(t,n,...s){return s.at(0)?.invoke&&(r.has(this)||r.set(this,new Map),r.get(this).set(t,[].concat(s[0].invoke)),delete s[0].invoke),e.call(this,t,n,...s)}})}const n=t&&(e=>{const{currentTarget:t,target:n,type:s}=e;for(const o of r.get(t||n)?.get(s)||[])e[o]()});return(r,s,o,...a)=>{let i=0;const c=new Map,l=new Map,{[o]:u}=r,f=a.length?q(K(globalThis),...a):globalThis,p=X(((e,t)=>{if(!c.has(t)){let e;for(;l.has(e=i++););c.set(t,e),l.set(e,t)}return Q(e,c.get(t))})),d=new FinalizationRegistry((e=>{u(we,Q(R,e))})),g=([e,r])=>{switch(e){case O:if(null==r)return f;if(typeof r===W)return l.get(r);if(!(r instanceof Y))for(const e in r)r[e]=g(r[e]);return r;case F:if(typeof r===R){if(!l.has(r)){const e=function(...e){return t&&e.at(0)instanceof Event&&n(...e),u(re,Q(F,r),p(this),e.map(p))},s=new WeakRef(e);l.set(r,s),d.register(e,r,s)}return l.get(r).deref()}return l.get(r);case J:return ee(r)}return r},w={[re]:(e,t,r)=>p(e.apply(t,r)),[ne]:(e,t)=>p(new e(...t)),[se]:(e,t,r)=>p(L(e,t,r)),[oe]:(e,t)=>p(delete e[t]),[ce]:e=>p(H(e)),[ae]:(e,t)=>p(e[t]),[ie]:(e,t)=>{const r=I(e,t);return r?Q(O,V(r,p)):Q(B,r)},[le]:(e,t)=>p(t in e),[ue]:e=>p(C(e)),[fe]:e=>Q(O,D(e).map(p)),[pe]:e=>p(N(e)),[de]:(e,t,r)=>p(U(e,t,r)),[ge]:(e,t)=>p(z(e,t)),[we](e){c.delete(l.get(e)),l.delete(e)}};return r[s]=(e,t,...r)=>{switch(e){case re:r[0]=g(r[0]),r[1]=r[1].map(g);break;case ne:r[0]=r[0].map(g);break;case se:{const[e,t]=r;r[0]=g(e);const{get:n,set:s,value:o}=t;n&&(t.get=g(n)),s&&(t.set=g(s)),o&&(t.value=g(o));break}default:r=r.map(g)}return w[e](g(t),...r)},{proxy:r,[e.toLowerCase()]:f,[`is${e}Proxy`]:()=>!1}}})("Window",!0),he=(e=>{let t=0;const r=new Map,n=new Map,s=Symbol(),o=e=>typeof e===F?e():e,a=e=>typeof e===O&&!!e&&s in e,i=Array[G],c=X(((e,a)=>{if(s in a)return o(a[s]);if(e===F){if(!n.has(a)){let e;for(;n.has(e=String(t++)););r.set(a,e),n.set(e,a)}return Q(e,r.get(a))}if(!(a instanceof Y))for(const e in a)a[e]=c(a[e]);return Q(e,a)}));return(t,l,u)=>{const{[l]:f}=t,p=new Map,d=new FinalizationRegistry((e=>{p.delete(e),f(we,c(e))})),g=e=>{const[t,r]=e;if(!p.has(r)){const n=t===F?te.bind(e):e,s=new Proxy(n,h),o=new WeakRef(s);p.set(r,o),d.register(s,r,o)}return p.get(r).deref()},w=e=>{const[t,r]=e;switch(t){case O:return null===r?globalThis:typeof r===W?g(e):r;case F:return typeof r===R?n.get(r):g(e);case J:return ee(r)}return r},y=(e,t,...r)=>w(f(e,o(t),...r)),h={[re]:(e,t,r)=>y(re,e,c(t),r.map(c)),[ne]:(e,t)=>y(ne,e,t.map(c)),[se]:(e,t,r)=>{const{get:n,set:s,value:o}=r;return typeof n===F&&(r.get=c(n)),typeof s===F&&(r.set=c(s)),typeof o===F&&(r.value=c(o)),y(se,e,c(t),r)},[oe]:(e,t)=>y(oe,e,c(t)),[ce]:e=>y(ce,e),[ae]:(e,t)=>t===s?e:y(ae,e,c(t)),[ie]:(e,t)=>{const r=y(ie,e,c(t));return r&&V(r,w)},[le]:(e,t)=>t===s||y(le,e,c(t)),[ue]:e=>y(ue,e),[fe]:e=>y(fe,e).map(w),[pe]:e=>y(pe,e),[de]:(e,t,r)=>y(de,e,c(t),c(r)),[ge]:(e,t)=>y(ge,e,c(t))};t[u]=(e,t,s,o)=>{switch(e){case re:return w(t).apply(w(s),o.map(w));case we:{const e=w(t);r.delete(n.get(e)),n.delete(e)}}};const m=new Proxy([O,null],h),b=m.Array[G];return L(Array,G,{value:e=>a(e)?b(e):i(e)}),{[e.toLowerCase()]:m,[`is${e}Proxy`]:a,proxy:t}}})("Window");const me=new WeakMap,be=(e,...t)=>{const r=x(e,...t);if(!me.has(r)){const t=e instanceof Worker?ye:he;me.set(r,t(r,d,g))}return me.get(r)};be.transfer=x.transfer;const{isArray:ve}=Array,{assign:Se,create:Ae,defineProperties:Pe,defineProperty:Ee,entries:Me}=Object,{all:je,resolve:$e}=new Proxy(Promise,{get:(e,t)=>e[t].bind(e)}),_e=(e,t=location.href)=>new URL(e,t).href;Promise.withResolvers||(Promise.withResolvers=function(){var e,t,r=new this((function(r,n){e=r,t=n}));return{resolve:e,reject:t,promise:r}});const ke=e=>e.arrayBuffer(),Te=e=>e.json(),xe=e=>e.text(),Oe=e=>e.replace(/^[^\\r\\n]+$/,(e=>e.trim())),Fe=new WeakMap,We=e=>{const t=e||console,r={stderr:(t.stderr||console.error).bind(t),stdout:(t.stdout||console.log).bind(t)};return{stderr:(...e)=>r.stderr(...e),stdout:(...e)=>r.stdout(...e),async get(e){const t=await e;return Fe.set(t,r),t}}},Re=({FS:e,PATH:t,PATH_FS:r},n,s)=>{const o=r.resolve(n);return e.mkdirTree(t.dirname(o)),e.writeFile(o,new Uint8Array(s),{canOwn:!0})},Be=e=>{const t=e.split("/");return t.pop(),t.join("/")},Je=(e,t)=>{const r=[];for(const n of t.split("/"))"."!==n&&(r.push(n),n&&e.mkdir(r.join("/")))},Le=(e,t)=>{const r=[];for(const e of t.split("/"))switch(e){case"":case".":break;case"..":r.pop();break;default:r.push(e)}return[e.cwd()].concat(r).join("/").replace(/^\\/+/,"/")},Ie=e=>{const t=e.map((e=>e.trim().replace(/(^[/]*|[/]*$)/g,""))).filter((e=>""!==e&&"."!==e)).join("/");return e[0].startsWith("/")?`/${t}`:t},He=new WeakMap,Ce=(e,t,r)=>je((e=>{for(const{files:t,to_file:r,from:n=""}of e){if(void 0!==t&&void 0!==r)throw new Error("Cannot use \'to_file\' and \'files\' parameters together!");if(void 0===t&&void 0===r&&n.endsWith("/"))throw new Error(`Couldn\'t determine the filename from the path ${n}, please supply \'to_file\' parameter.`)}return e.flatMap((({from:e="",to_folder:t=".",to_file:r,files:n})=>{if(ve(n))return n.map((r=>({url:Ie([e,r]),path:Ie([t,r])})));const s=r||e.slice(1+e.lastIndexOf("/"));return[{url:e,path:Ie([t,s])}]}))})(r).map((({url:n,path:s})=>((e,t)=>fetch(_e(t,He.get(e))))(r,n).then(ke).then((r=>e.writeFile(t,s,r)))))),De=(e,t,r)=>{e.registerJsModule(t,r)},Ne=(e,t)=>e.runPython(Oe(t)),Ue=(e,t)=>e.runPythonAsync(Oe(t)),ze=async(e,t,r)=>{const[n,...s]=t.split(".");let o,a=e.globals.get(n);for(const e of s)[o,a]=[a,a[e]];await a.call(o,r)};var qe={type:"micropython",module:(e="1.20.0-297")=>`https://cdn.jsdelivr.net/npm/@micropython/micropython-webassembly-pyscript@${e}/micropython.mjs`,async engine({loadMicroPython:e},t,r){const{stderr:n,stdout:s,get:o}=We();r=r.replace(/\\.m?js$/,".wasm");const a=await o(e({stderr:n,stdout:s,url:r}));return t.fetch&&await Ce(this,a,t.fetch),a},registerJSModule:De,run:Ne,runAsync:Ue,runEvent:ze,writeFile:({FS:e,_module:{PATH:t,PATH_FS:r}},n,s)=>Re({FS:e,PATH:t,PATH_FS:r},n,s)};var Ke={type:"pyodide",module:(e="0.23.4")=>`https://cdn.jsdelivr.net/pyodide/v${e}/full/pyodide.mjs`,async engine({loadPyodide:e},t,r){const{stderr:n,stdout:s,get:o}=We(),a=r.slice(0,r.lastIndexOf("/")),i=await o(e({stderr:n,stdout:s,indexURL:a}));if(t.fetch&&await Ce(this,i,t.fetch),t.packages){await i.loadPackage("micropip");const e=await i.pyimport("micropip");await e.install(t.packages),e.destroy()}return i},registerJSModule:De,run:Ne,runAsync:Ue,runEvent:ze,writeFile:({FS:e,PATH:t,_module:{PATH_FS:r}},n,s)=>Re({FS:e,PATH:t,PATH_FS:r},n,s)};const Ye="ruby-wasm-wasi",Ge=Ye.replace(/\\W+/g,"_");var Ve={type:Ye,experimental:!0,module:(e="2.0.0")=>`https://cdn.jsdelivr.net/npm/ruby-3_2-wasm-wasi@${e}/dist/browser.esm.js`,async engine({DefaultRubyVM:e},t,r){const n=await fetch(`${r.slice(0,r.lastIndexOf("/"))}/ruby.wasm`),s=await WebAssembly.compile(await n.arrayBuffer()),{vm:o}=await e(s);return t.fetch&&await Ce(this,o,t.fetch),o},registerJSModule(e,t,r){const n=[\'require "js"\'];for(const[e,t]of Me(r)){const r=`__module_${Ge}_${e}`;globalThis[r]=t,n.push(`$${e}=JS.global[:${r}]`)}this.run(e,n.join(";"))},run:(e,t)=>e.eval(Oe(t)),runAsync:(e,t)=>e.evalAsync(Oe(t)),async runEvent(e,t,r){if(/^xworker\\.(on\\w+)$/.test(t)){const{$1:t}=RegExp,n=`__module_${Ge}_event`;globalThis[n]=r,this.run(e,`require "js";$xworker.call("${t}",JS.global[:${n}])`),delete globalThis[n]}else{const n=this.run(e,`method(:${t})`);await n.call(t,e.wrap(r))}},writeFile:()=>{throw new Error(`writeFile is not supported in ${Ye}`)}};var Qe={type:"wasmoon",module:(e="1.15.0")=>`https://cdn.jsdelivr.net/npm/wasmoon@${e}/+esm`,async engine({LuaFactory:e,LuaLibraries:t},r){const{stderr:n,stdout:s,get:o}=We(),a=await o((new e).createEngine());return a.global.getTable(t.Base,(e=>{a.global.setField(e,"print",s),a.global.setField(e,"printErr",n)})),r.fetch&&await Ce(this,a,r.fetch),a},registerJSModule:(e,t,r)=>{for(const[t,n]of Me(r))e.global.set(t,n)},run:(e,t)=>e.doStringSync(Oe(t)),runAsync:(e,t)=>e.doString(Oe(t)),runEvent:async(e,t,r)=>{const[n,...s]=t.split(".");let o,a=e.global.get(n);for(const e of s)[o,a]=[a,a[e]];await a.call(o,r)},writeFile:({cmodule:{module:{FS:e}}},t,r)=>((e,t,r)=>(Je(e,Be(t)),t=Le(e,t),e.writeFile(t,new Uint8Array(r),{canOwn:!0})))(e,t,r)};const Xe=new Map,Ze=new Map,et=new Proxy(new Map,{get(e,t){if(!e.has(t)){const[r,...n]=t.split("@"),s=Xe.get(r),o=/^https?:\\/\\//i.test(n)?n.join("@"):s.module(...n);e.set(t,{url:o,module:import(o),engine:s.engine.bind(s)})}const{url:r,module:n,engine:s}=e.get(t);return(e,o)=>n.then((n=>{Ze.set(t,e);const a=e?.fetch;return a&&He.set(a,o),s(n,e,r)}))}}),tt=e=>{for(const t of[].concat(e.type))Xe.set(t,e)};for(const e of[qe,Ke,Ve,Qe])tt(e);const rt=async e=>(await import("https://cdn.jsdelivr.net/npm/basic-toml@0.3.1/es.js")).parse(e);try{new SharedArrayBuffer(4)}catch(e){throw new Error(["Unable to use SharedArrayBuffer due insecure environment.","Please read requirements in MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements"].join("\\n"))}let nt,st;const ot=(e,t)=>{addEventListener(e,t||(async t=>{try{await nt,st(`xworker.on${e}`,t)}catch(e){postMessage(e)}}),!!t&&{once:!0})},{proxy:at,window:it,isWindowProxy:ct}=be(self,f),lt={sync:at,window:it,isWindowProxy:ct,onmessage:console.info,onerror:console.error,onmessageerror:console.warn,postMessage:postMessage.bind(self)};ot("message",(({data:{options:e,code:t,hooks:r}})=>{nt=(async()=>{try{const{type:n,version:s,config:o,async:a}=e,i=await((e,t)=>{let r={};if(t){if(t.endsWith(".json"))r=fetch(t).then(Te);else if(t.endsWith(".toml"))r=fetch(t).then(xe).then(rt);else{try{r=JSON.parse(t)}catch(e){r=rt(t)}t="./config.txt"}t=_e(t)}return $e(r).then((r=>et[e](r,t)))})(((e,t="")=>`${e}@${t}`.replace(/@$/,""))(n,s),o),c=Ae(Xe.get(n)),l="run"+(a?"Async":"");if(r){const{beforeRun:e,beforeRunAsync:t,afterRun:n,afterRunAsync:s}=r,o=n||s,a=e||t;if(o){const e=c[l].bind(c);c[l]=(t,r)=>e(t,`${r}\\n${o}`)}if(a){const e=c[l].bind(c);c[l]=(t,r)=>e(t,`${a}\\n${r}`)}}return c.registerJSModule(i,"polyscript",{xworker:lt}),st=c.runEvent.bind(c,i),await c[l](i,t),i}catch(e){postMessage(e)}})(),ot("error"),ot("message"),ot("messageerror")}));\n'],{type:"application/javascript"})),{type:"module"}),{postMessage:s}=n,o=this instanceof Fe;if(e.length){const[t,n]=e;(r=Ee({},r||{type:t,version:n})).type||(r.type=t)}r?.config&&(r.config=Oe(r.config));const a=fetch(t).then(We).then((e=>{const t=o?this.stringHooks:void 0;s.call(n,{options:r,code:e,hooks:t})}));return Pe(n,{postMessage:{value:(e,...t)=>a.then((()=>s.call(n,e,...t)))},sync:{value:Se(n,d).proxy},onerror:{writable:!0,configurable:!0,value:console.error}}),o&&this.onWorkerReady?.(this.interpreter,n),n.addEventListener("message",(e=>{const{data:t}=e;t instanceof Error&&(e.stopImmediatePropagation(),n.onerror(Object.create(e,{type:{value:"error"},error:{value:t}})))})),n};Promise.withResolvers||(Promise.withResolvers=function(){var e,t,r=new this((function(r,n){e=r,t=n}));return{resolve:e,reject:t,promise:r}});const Le=e=>e.replace(/^[^\r\n]+$/,(e=>e.trim())),Ie=new WeakMap,Je=e=>{const t=e||console,r={stderr:(t.stderr||console.error).bind(t),stdout:(t.stdout||console.log).bind(t)};return{stderr:(...e)=>r.stderr(...e),stdout:(...e)=>r.stdout(...e),async get(e){const t=await e;return Ie.set(t,r),t}}},He=({FS:e,PATH:t,PATH_FS:r},n,s)=>{const o=r.resolve(n);return e.mkdirTree(t.dirname(o)),e.writeFile(o,new Uint8Array(s),{canOwn:!0})},Ce=e=>{const t=e.split("/");return t.pop(),t.join("/")},Ne=(e,t)=>{const r=[];for(const n of t.split("/"))"."!==n&&(r.push(n),n&&e.mkdir(r.join("/")))},De=(e,t)=>{const r=[];for(const e of t.split("/"))switch(e){case"":case".":break;case"..":r.pop();break;default:r.push(e)}return[e.cwd()].concat(r).join("/").replace(/^\/+/,"/")},Ue=e=>{const t=e.map((e=>e.trim().replace(/(^[/]*|[/]*$)/g,""))).filter((e=>""!==e&&"."!==e)).join("/");return e[0].startsWith("/")?`/${t}`:t},ze=new WeakMap,qe=(e,t,r)=>je((e=>{for(const{files:t,to_file:r,from:n=""}of e){if(void 0!==t&&void 0!==r)throw new Error("Cannot use 'to_file' and 'files' parameters together!");if(void 0===t&&void 0===r&&n.endsWith("/"))throw new Error(`Couldn't determine the filename from the path ${n}, please supply 'to_file' parameter.`)}return e.flatMap((({from:e="",to_folder:t=".",to_file:r,files:n})=>{if(Ae(n))return n.map((r=>({url:Ue([e,r]),path:Ue([t,r])})));const s=r||e.slice(1+e.lastIndexOf("/"));return[{url:e,path:Ue([t,s])}]}))})(r).map((({url:n,path:s})=>((e,t)=>fetch(Oe(t,ze.get(e))))(r,n).then(Te).then((r=>e.writeFile(t,s,r)))))),Qe=(e,t,r)=>{e.registerJsModule(t,r)},Xe=(e,t)=>e.runPython(Le(t)),Ye=(e,t)=>e.runPythonAsync(Le(t)),Ge=async(e,t,r)=>{const[n,...s]=t.split(".");let o,a=e.globals.get(n);for(const e of s)[o,a]=[a,a[e]];await a.call(o,r)};var Ke={type:"micropython",module:(e="1.20.0-297")=>`https://cdn.jsdelivr.net/npm/@micropython/micropython-webassembly-pyscript@${e}/micropython.mjs`,async engine({loadMicroPython:e},t,r){const{stderr:n,stdout:s,get:o}=Je();r=r.replace(/\.m?js$/,".wasm");const a=await o(e({stderr:n,stdout:s,url:r}));return t.fetch&&await qe(this,a,t.fetch),a},registerJSModule:Qe,run:Xe,runAsync:Ye,runEvent:Ge,writeFile:({FS:e,_module:{PATH:t,PATH_FS:r}},n,s)=>He({FS:e,PATH:t,PATH_FS:r},n,s)};var Ve={type:"pyodide",module:(e="0.23.4")=>`https://cdn.jsdelivr.net/pyodide/v${e}/full/pyodide.mjs`,async engine({loadPyodide:e},t,r){const{stderr:n,stdout:s,get:o}=Je(),a=r.slice(0,r.lastIndexOf("/")),i=await o(e({stderr:n,stdout:s,indexURL:a}));if(t.fetch&&await qe(this,i,t.fetch),t.packages){await i.loadPackage("micropip");const e=await i.pyimport("micropip");await e.install(t.packages),e.destroy()}return i},registerJSModule:Qe,run:Xe,runAsync:Ye,runEvent:Ge,writeFile:({FS:e,PATH:t,_module:{PATH_FS:r}},n,s)=>He({FS:e,PATH:t,PATH_FS:r},n,s)};const Ze="ruby-wasm-wasi",et=Ze.replace(/\W+/g,"_");var tt={type:Ze,experimental:!0,module:(e="2.0.0")=>`https://cdn.jsdelivr.net/npm/ruby-3_2-wasm-wasi@${e}/dist/browser.esm.js`,async engine({DefaultRubyVM:e},t,r){const n=await fetch(`${r.slice(0,r.lastIndexOf("/"))}/ruby.wasm`),s=await WebAssembly.compile(await n.arrayBuffer()),{vm:o}=await e(s);return t.fetch&&await qe(this,o,t.fetch),o},registerJSModule(e,t,r){const n=['require "js"'];for(const[e,t]of ke(r)){const r=`__module_${et}_${e}`;globalThis[r]=t,n.push(`$${e}=JS.global[:${r}]`)}this.run(e,n.join(";"))},run:(e,t)=>e.eval(Le(t)),runAsync:(e,t)=>e.evalAsync(Le(t)),async runEvent(e,t,r){if(/^xworker\.(on\w+)$/.test(t)){const{$1:t}=RegExp,n=`__module_${et}_event`;globalThis[n]=r,this.run(e,`require "js";$xworker.call("${t}",JS.global[:${n}])`),delete globalThis[n]}else{const n=this.run(e,`method(:${t})`);await n.call(t,e.wrap(r))}},writeFile:()=>{throw new Error(`writeFile is not supported in ${Ze}`)}};var rt={type:"wasmoon",module:(e="1.15.0")=>`https://cdn.jsdelivr.net/npm/wasmoon@${e}/+esm`,async engine({LuaFactory:e,LuaLibraries:t},r){const{stderr:n,stdout:s,get:o}=Je(),a=await o((new e).createEngine());return a.global.getTable(t.Base,(e=>{a.global.setField(e,"print",s),a.global.setField(e,"printErr",n)})),r.fetch&&await qe(this,a,r.fetch),a},registerJSModule:(e,t,r)=>{for(const[t,n]of ke(r))e.global.set(t,n)},run:(e,t)=>e.doStringSync(Le(t)),runAsync:(e,t)=>e.doString(Le(t)),runEvent:async(e,t,r)=>{const[n,...s]=t.split(".");let o,a=e.global.get(n);for(const e of s)[o,a]=[a,a[e]];await a.call(o,r)},writeFile:({cmodule:{module:{FS:e}}},t,r)=>((e,t,r)=>(Ne(e,Ce(t)),t=De(e,t),e.writeFile(t,new Uint8Array(r),{canOwn:!0})))(e,t,r)};const nt=new Map,st=new Map,ot=[],at=[],it=new Proxy(new Map,{get(e,t){if(!e.has(t)){const[r,...n]=t.split("@"),s=nt.get(r),o=/^https?:\/\//i.test(n)?n.join("@"):s.module(...n);e.set(t,{url:o,module:import(o),engine:s.engine.bind(s)})}const{url:r,module:n,engine:s}=e.get(t);return(e,o)=>n.then((n=>{st.set(t,e);const a=e?.fetch;return a&&ze.set(a,o),s(n,e,r)}))}}),ct=e=>{for(const t of[].concat(e.type))nt.set(t,e),ot.push(`script[type="${t}"]`),at.push(`${t}-`)};for(const e of[Ke,Ve,tt,rt])ct(e);const lt=async e=>(await import("https://cdn.jsdelivr.net/npm/basic-toml@0.3.1/es.js")).parse(e),ut=(e,t)=>{let r={};if(t){if(t.endsWith(".json"))r=fetch(t).then(xe);else if(t.endsWith(".toml"))r=fetch(t).then(We).then(lt);else{try{r=JSON.parse(t)}catch(e){r=lt(t)}t="./config.txt"}t=Oe(t)}return _e(r).then((r=>it[e](r,t)))},ft=(e,t="")=>`${e}@${t}`.replace(/@$/,""),pt=(e,t)=>{const r=(e=>{let t=e;for(;t.parentNode;)t=t.parentNode;return t})(e);return r.getElementById(t)||((e,t=document)=>t.querySelector(e))(t,r)},dt=new WeakMap,ht={get(){let e=dt.get(this);return e||(e=document.createElement(`${this.type}-script`),dt.set(this,e),bt(this)),e},set(e){"string"==typeof e?dt.set(this,pt(this,e)):(dt.set(this,e),bt(this))}},gt=new WeakMap,yt=new Map,wt=(e,t)=>{const r=e?.value;return r?t+r:""},mt=(e,t,r,n,s)=>{if(!yt.has(t)){const o={interpreter:ut(r,s),queue:_e(),XWorker:Be(e,n)};yt.set(t,o),yt.has(e)||yt.set(e,o)}return yt.get(t)},bt=async e=>{if(gt.has(e)){const{target:t}=e;t&&(e.closest("head")?document.body.append(t):e.after(t))}else{const{attributes:{async:t,config:r,env:n,target:s,version:o},src:a,type:i}=e,c=o?.value,l=ft(i,c),u=wt(s,"");let f=wt(r,"|");const p=wt(n,"")||`${l}${f}`;f=f.slice(1),f&&(f=Oe(f));const d=mt(i,p,l,c,f);gt.set(Me(e,"target",ht),d),u&&dt.set(e,pt(e,u));const h=a?fetch(a).then(We):e.textContent;d.queue=d.queue.then((()=>(async(e,t,r,n)=>{const s=nt.get(e.type);s.experimental&&console.warn(`The ${e.type} interpreter is experimental`);const[o,a]=await je([gt.get(e).interpreter,t]);try{return Me(document,"currentScript",{configurable:!0,get:()=>e}),s.registerJSModule(o,"polyscript",{XWorker:r}),s[n?"runAsync":"run"](o,a)}finally{delete document.currentScript}})(e,h,d.XWorker,!!t)))}},vt=new Proxy($e(null),{get:(e,t)=>St(t)}),St=async e=>{if(yt.has(e)){const{interpreter:t,queue:r}=yt.get(e);return(await je([t,r]))[0]}const t=yt.size?`Available interpreters are: ${[...yt.keys()].map((e=>`"${e}"`)).join(", ")}.`:"There are no interpreters in this page.";throw new Error(`The interpreter "${e}" was not found. ${t}`)},At=async e=>{const{type:r,currentTarget:n}=e;for(let{name:s,value:o,ownerElement:a}of t(`./@*[${at.map((e=>`name()="${e}${r}"`)).join(" or ")}]`,n)){s=s.slice(0,-(r.length+1));const t=await St(a.getAttribute(`${s}-env`)||s);nt.get(s).runEvent(t,o,e)}},Et=e=>{for(let{name:r,ownerElement:n}of t(`.//@*[${at.map((e=>`starts-with(name(),"${e}")`)).join(" or ")}]`,e))r=r.slice(r.lastIndexOf("-")+1),"env"!==r&&n.addEventListener(r,At)},$t=[],Pt=new Map,Mt=new Map,kt=e=>{for(const t of $t)if(e.matches(t)){const r=Pt.get(t),{resolve:n}=Mt.get(r),{options:s,known:o}=jt.get(r);if(!o.has(e)){o.add(e);const{interpreter:t,version:a,config:i,env:c,onInterpreterReady:l}=s,u=ft(t,a),f=c||`${u}${i?`|${i}`:""}`,{interpreter:p,XWorker:d}=mt(t,f,u,a,i);p.then((o=>{const a=$e(nt.get(t)),{onBeforeRun:i,onBeforeRunAsync:c,onAfterRun:f,onAfterRunAsync:p}=s,h=new Fe(o,s),g=function(...e){return d.apply(h,e)};for(const[t,[r,n]]of[["run",[i,f]]]){const s=a[t];a[t]=function(t,o){r&&r.call(this,y,e);const a=s.call(this,t,o);return n&&n.call(this,y,e),a}}for(const[t,[r,n]]of[["runAsync",[c,p]]]){const s=a[t];a[t]=async function(t,o){r&&await r.call(this,y,e);const a=await s.call(this,t,o);return n&&await n.call(this,y,e),a}}a.registerJSModule(o,"polyscript",{XWorker:g});const y={type:r,interpreter:o,XWorker:g,io:Ie.get(o),config:structuredClone(st.get(u)),run:a.run.bind(a,o),runAsync:a.runAsync.bind(a,o),runEvent:a.runEvent.bind(a,o)};n(y),l?.(y,e)}))}}},jt=new Map,_t=(t,r)=>{if(nt.has(t)||jt.has(t))throw new Error(`<script type="${t}"> already registered`);if(!nt.has(r?.interpreter))throw new Error("Unspecified interpreter");nt.set(t,nt.get(r?.interpreter)),Ot(t);const n=[`script[type="${t}"]`,`${t}-script`];for(const e of n)Pt.set(e,t);$t.push(...n),at.push(`${t}-`),jt.set(t,{options:Ee({env:t},r),known:new WeakSet}),Et(document),e(n.join(",")).forEach(kt)},Ot=e=>(Mt.has(e)||Mt.set(e,Promise.withResolvers()),Mt.get(e).promise),Tt=Be(),xt=ot.join(","),Wt=new MutationObserver((t=>{for(const{type:r,target:n,attributeName:s,addedNodes:o}of t)if("attributes"!==r){for(const t of o)if(1===t.nodeType)if(Et(t),t.matches(xt))bt(t);else{if(e(xt,t).forEach(bt),!$t.length)continue;kt(t),e($t.join(","),t).forEach(kt)}}else{const e=s.lastIndexOf("-")+1;if(e){const t=s.slice(0,e);for(const r of at)if(t===r){const t=s.slice(e);if("env"!==t){const e=n.hasAttribute(s)?"add":"remove";n[`${e}EventListener`](t,At)}break}}}})),Rt=e=>(Wt.observe(e,{childList:!0,subtree:!0,attributes:!0}),e),{attachShadow:Ft}=Element.prototype;Ee(Element.prototype,{attachShadow(e){return Rt(Ft.call(this,e))}}),Et(Rt(document)),e(xt,document).forEach(bt);export{Tt as XWorker,_t as define,vt as env,Ot as whenDefined};
