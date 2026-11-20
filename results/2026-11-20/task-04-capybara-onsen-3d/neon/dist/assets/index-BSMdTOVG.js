(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function e(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=e(s);fetch(s.href,r)}})();const ya="187",qi={ROTATE:0,DOLLY:1,PAN:2},Xi={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Gh=0,hl=1,kh=2,gs=1,Hh=2,ds=3,yi=0,Je=1,sn=2,Zi=0,Si=1,ul=2,dl=3,fl=4,Vh=5,Wi=100,Wh=101,Xh=102,Yh=103,qh=104,Zh=200,Kh=201,Jh=202,$h=203,Ec=204,bc=205,Qh=206,jh=207,tu=208,eu=209,nu=210,iu=211,su=212,ru=213,ou=214,To=0,Ao=1,Ro=2,ys=3,Co=4,Po=5,Lo=6,Do=7,Tc=0,au=1,lu=2,Xn=0,Ac=1,Rc=2,Cc=3,wa=4,Pc=5,Lc=6,Dc=7,Ic=300,Ji=301,ws=302,Xr=303,Yr=304,Es=1e3,Wn=1001,Io=1002,Ve=1003,cu=1004,zs=1005,cn=1006,qr=1007,ri=1008,mn=1009,Nc=1010,Uc=1011,bs=1012,Ea=1013,Dn=1014,Cn=1015,In=1016,ba=1017,Ta=1018,$i=1020,Fc=35902,Oc=35899,zc=1021,Bc=1022,Pn=1023,li=1026,oi=1027,Gc=1028,Aa=1029,wi=1030,Ra=1031,Ca=1033,mr=33776,gr=33777,_r=33778,xr=33779,No=35840,Uo=35841,Fo=35842,Oo=35843,zo=36196,Bo=37492,Go=37496,ko=37488,Ho=37489,wr=37490,Vo=37491,Wo=37808,Xo=37809,Yo=37810,qo=37811,Zo=37812,Ko=37813,Jo=37814,$o=37815,Qo=37816,jo=37817,ta=37818,ea=37819,na=37820,ia=37821,sa=36492,ra=36494,oa=36495,aa=36283,la=36284,Er=36285,ca=36286,hu=3200,ha=0,uu=1,ii="",ke="srgb",br="srgb-linear",Tr="linear",re="srgb",Zr=7680,du=519,fu=512,pu=513,mu=514,kc=515,gu=516,_u=517,Hc=518,Vc=519,Wc=35044,pl="300 es",En=2e3,Ts=2001;function xu(i){for(let t=i.length-1;t>=0;--t)if(i[t]>=65535)return!0;return!1}function Ar(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function vu(){const i=Ar("canvas");return i.style.display="block",i}const ml={};function Rr(...i){const t="THREE."+i.shift();console.log(t,...i)}function Xc(i){const t=i[0];if(typeof t=="string"&&t.startsWith("TSL:")){const e=i[1];e&&e.isStackTrace?i[0]+=" "+e.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Ot(...i){i=Xc(i);const t="THREE."+i.shift();{const e=i[0];e&&e.isStackTrace?console.warn(e.getError(t)):console.warn(t,...i)}}function Qt(...i){i=Xc(i);const t="THREE."+i.shift();{const e=i[0];e&&e.isStackTrace?console.error(e.getError(t)):console.error(t,...i)}}function vr(...i){const t=i.join(" ");t in ml||(ml[t]=!0,Ot(...i))}function Mu(i,t,e){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(t,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:n()}}setTimeout(r,e)})}const Su={[To]:To,[Ro]:Lo,[Co]:Co,[ys]:Po,[Ao]:Ao,[Lo]:Ro,[Do]:Do,[Po]:ys};class ui{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){const n=this._listeners;return n===void 0?!1:n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){const n=this._listeners;if(n===void 0)return;const s=n[t];if(s!==void 0){const r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){const e=this._listeners;if(e===void 0)return;const n=e[t.type];if(n!==void 0){t.target=this;const s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,t);t.target=null}}}const Ye=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let gl=1234567;const _s=Math.PI/180,As=180/Math.PI;function Kn(){const i=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ye[i&255]+Ye[i>>8&255]+Ye[i>>16&255]+Ye[i>>24&255]+"-"+Ye[t&255]+Ye[t>>8&255]+"-"+Ye[t>>16&15|64]+Ye[t>>24&255]+"-"+Ye[e&63|128]+Ye[e>>8&255]+"-"+Ye[e>>16&255]+Ye[e>>24&255]+Ye[n&255]+Ye[n>>8&255]+Ye[n>>16&255]+Ye[n>>24&255]).toLowerCase()}function Vt(i,t,e){return Math.max(t,Math.min(e,i))}function Pa(i,t){return(i%t+t)%t}function yu(i,t,e,n,s){return n+(i-t)*(s-n)/(e-t)}function wu(i,t,e){return i!==t?(e-i)/(t-i):0}function xs(i,t,e){return(1-e)*i+e*t}function Eu(i,t,e,n){return xs(i,t,1-Math.exp(-e*n))}function bu(i,t=1){return t-Math.abs(Pa(i,t*2)-t)}function Tu(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*(3-2*i))}function Au(i,t,e){return i<=t?0:i>=e?1:(i=(i-t)/(e-t),i*i*i*(i*(i*6-15)+10))}function Ru(i,t){return i+Math.floor(Math.random()*(t-i+1))}function Cu(i,t){return i+Math.random()*(t-i)}function Pu(i){return i*(.5-Math.random())}function Lu(i){i!==void 0&&(gl=i);let t=gl+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Du(i){return i*_s}function Iu(i){return i*As}function Nu(i){return i>0&&Number.isInteger(i)&&2**Math.round(Math.log2(i))===i}function Uu(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Yc(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Fu(i,t,e,n,s){const r=Math.cos,o=Math.sin,a=r(e/2),l=o(e/2),c=r((t+n)/2),h=o((t+n)/2),u=r((t-n)/2),d=o((t-n)/2),f=r((n-t)/2),_=o((n-t)/2);switch(s){case"XYX":i.set(a*h,l*u,l*d,a*c);break;case"YZY":i.set(l*d,a*h,l*u,a*c);break;case"ZXZ":i.set(l*u,l*d,a*h,a*c);break;case"XZX":i.set(a*h,l*_,l*f,a*c);break;case"YXY":i.set(l*f,a*h,l*_,a*c);break;case"ZYZ":i.set(l*_,l*f,a*h,a*c);break;default:Ot("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Or(i){switch(i.constructor){case Uint32Array:return 4294967295;case Uint16Array:return 65535;case Uint8Array:case Uint8ClampedArray:return 255;case Int32Array:return 2147483647;case Int16Array:return 32767;case Int8Array:return 127;default:return}}function La(i,t){if(t.constructor===Float32Array)return i;const e=Or(t);if(e===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.max(i/e,-1)}function Da(i,t){if(t.constructor===Float32Array)return i;const e=Or(t);if(e===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.round(i*e)}const Ae={DEG2RAD:_s,RAD2DEG:As,generateUUID:Kn,clamp:Vt,euclideanModulo:Pa,mapLinear:yu,inverseLerp:wu,lerp:xs,damp:Eu,pingpong:bu,smoothstep:Tu,smootherstep:Au,randInt:Ru,randFloat:Cu,randFloatSpread:Pu,seededRandom:Lu,degToRad:Du,radToDeg:Iu,isPowerOfTwo:Nu,ceilPowerOfTwo:Uu,floorPowerOfTwo:Yc,setQuaternionFromProperEuler:Fu,normalize:Da,denormalize:La},Qa=class Qa{constructor(t=0,e=0){this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("THREE.Vector2: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6],this.y=s[1]*e+s[4]*n+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Vt(this.x,t.x,e.x),this.y=Vt(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=Vt(this.x,t,e),this.y=Vt(this.y,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Vt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Vt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),s=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*n-o*s+t.x,this.y=r*s+o*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Qa.prototype.isVector2=!0;let ot=Qa;class ci{constructor(t=0,e=0,n=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=s}static slerpFlat(t,e,n,s,r,o,a){let l=n[s+0],c=n[s+1],h=n[s+2],u=n[s+3],d=r[o+0],f=r[o+1],_=r[o+2],M=r[o+3];if(u!==M||l!==d||c!==f||h!==_){let p=l*d+c*f+h*_+u*M;p<0&&(d=-d,f=-f,_=-_,M=-M,p=-p);let m=1-a;if(p<.9995){const x=Math.acos(p),y=Math.sin(x);m=Math.sin(m*x)/y,a=Math.sin(a*x)/y,l=l*m+d*a,c=c*m+f*a,h=h*m+_*a,u=u*m+M*a}else{l=l*m+d*a,c=c*m+f*a,h=h*m+_*a,u=u*m+M*a;const x=1/Math.sqrt(l*l+c*c+h*h+u*u);l*=x,c*=x,h*=x,u*=x}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=u}static multiplyQuaternionsFlat(t,e,n,s,r,o){const a=n[s],l=n[s+1],c=n[s+2],h=n[s+3],u=r[o],d=r[o+1],f=r[o+2],_=r[o+3];return t[e]=a*_+h*u+l*f-c*d,t[e+1]=l*_+h*d+c*u-a*f,t[e+2]=c*_+h*f+a*d-l*u,t[e+3]=h*_-a*u-l*d-c*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,s){return this._x=t,this._y=e,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,s=t._y,r=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(s/2),u=a(r/2),d=l(n/2),f=l(s/2),_=l(r/2);switch(o){case"XYZ":this._x=d*h*u+c*f*_,this._y=c*f*u-d*h*_,this._z=c*h*_+d*f*u,this._w=c*h*u-d*f*_;break;case"YXZ":this._x=d*h*u+c*f*_,this._y=c*f*u-d*h*_,this._z=c*h*_-d*f*u,this._w=c*h*u+d*f*_;break;case"ZXY":this._x=d*h*u-c*f*_,this._y=c*f*u+d*h*_,this._z=c*h*_+d*f*u,this._w=c*h*u-d*f*_;break;case"ZYX":this._x=d*h*u-c*f*_,this._y=c*f*u+d*h*_,this._z=c*h*_-d*f*u,this._w=c*h*u+d*f*_;break;case"YZX":this._x=d*h*u+c*f*_,this._y=c*f*u+d*h*_,this._z=c*h*_-d*f*u,this._w=c*h*u-d*f*_;break;case"XZY":this._x=d*h*u-c*f*_,this._y=c*f*u-d*h*_,this._z=c*h*_+d*f*u,this._w=c*h*u+d*f*_;break;default:Ot("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,s=Math.sin(n);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],s=e[4],r=e[8],o=e[1],a=e[5],l=e[9],c=e[2],h=e[6],u=e[10],d=n+a+u;if(d>0){const f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(o-s)*f}else if(n>a&&n>u){const f=2*Math.sqrt(1+n-a-u);this._w=(h-l)/f,this._x=.25*f,this._y=(s+o)/f,this._z=(r+c)/f}else if(a>u){const f=2*Math.sqrt(1+a-n-u);this._w=(r-c)/f,this._x=(s+o)/f,this._y=.25*f,this._z=(l+h)/f}else{const f=2*Math.sqrt(1+u-n-a);this._w=(o-s)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<1e-8?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Vt(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const s=Math.min(1,e/n);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,s=t._y,r=t._z,o=t._w,a=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+o*a+s*c-r*l,this._y=s*h+o*l+r*a-n*c,this._z=r*h+o*c+n*l-s*a,this._w=o*h-n*a-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){let n=t._x,s=t._y,r=t._z,o=t._w,a=this.dot(t);a<0&&(n=-n,s=-s,r=-r,o=-o,a=-a);let l=1-e;if(a<.9995){const c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,e=Math.sin(e*c)/h,this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this._onChangeCallback()}else this._x=this._x*l+n*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this.normalize();return this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const ja=class ja{constructor(t=0,e=0,n=0){this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("THREE.Vector3: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(_l.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(_l.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*n+r[6]*s,this.y=r[1]*e+r[4]*n+r[7]*s,this.z=r[2]*e+r[5]*n+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,s=this.z,r=t.elements,o=1/(r[3]*e+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*e+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*e+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(t){const e=this.x,n=this.y,s=this.z,r=t.x,o=t.y,a=t.z,l=t.w,c=2*(o*s-a*n),h=2*(a*e-r*s),u=2*(r*n-o*e);return this.x=e+l*c+o*u-a*h,this.y=n+l*h+a*c-r*u,this.z=s+l*u+r*h-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*n+r[8]*s,this.y=r[1]*e+r[5]*n+r[9]*s,this.z=r[2]*e+r[6]*n+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Vt(this.x,t.x,e.x),this.y=Vt(this.y,t.y,e.y),this.z=Vt(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=Vt(this.x,t,e),this.y=Vt(this.y,t,e),this.z=Vt(this.z,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Vt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,s=t.y,r=t.z,o=e.x,a=e.y,l=e.z;return this.x=s*l-r*a,this.y=r*o-n*l,this.z=n*a-s*o,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Kr.copy(this).projectOnVector(t),this.sub(Kr)}reflect(t){return this.sub(Kr.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(Vt(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,s=this.z-t.z;return e*e+n*n+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const s=Math.sin(e)*t;return this.x=s*Math.sin(n),this.y=Math.cos(e)*t,this.z=s*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,n=Math.sqrt(1-e*e);return this.x=n*Math.cos(t),this.y=e,this.z=n*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};ja.prototype.isVector3=!0;let R=ja;const Kr=new R,_l=new ci,tl=class tl{constructor(t,e,n,s,r,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,l,c)}set(t,e,n,s,r,o,a,l,c){const h=this.elements;return h[0]=t,h[1]=s,h[2]=a,h[3]=e,h[4]=r,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],u=n[7],d=n[2],f=n[5],_=n[8],M=s[0],p=s[3],m=s[6],x=s[1],y=s[4],v=s[7],T=s[2],b=s[5],g=s[8];return r[0]=o*M+a*x+l*T,r[3]=o*p+a*y+l*b,r[6]=o*m+a*v+l*g,r[1]=c*M+h*x+u*T,r[4]=c*p+h*y+u*b,r[7]=c*m+h*v+u*g,r[2]=d*M+f*x+_*T,r[5]=d*p+f*y+_*b,r[8]=d*m+f*v+_*g,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8];return e*o*h-e*a*c-n*r*h+n*a*l+s*r*c-s*o*l}invert(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],u=h*o-a*c,d=a*l-h*r,f=c*r-o*l,_=e*u+n*d+s*f;if(_===0)return this.set(0,0,0,0,0,0,0,0,0);const M=1/_;return t[0]=u*M,t[1]=(s*c-h*n)*M,t[2]=(a*n-s*o)*M,t[3]=d*M,t[4]=(h*e-s*l)*M,t[5]=(s*r-a*e)*M,t[6]=f*M,t[7]=(n*l-c*e)*M,t[8]=(o*e-n*r)*M,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,s,r,o,a){const l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+t,-s*c,s*l,-s*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){return vr("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Jr.makeScale(t,e)),this}rotate(t){return vr("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Jr.makeRotation(-t)),this}translate(t,e){return vr("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Jr.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let s=0;s<9;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}};tl.prototype.isMatrix3=!0;let Bt=tl;const Jr=new Bt,xl=new Bt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),vl=new Bt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Ou(){const i={enabled:!0,workingColorSpace:br,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===re&&(s.r=Yn(s.r),s.g=Yn(s.g),s.b=Yn(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===re&&(s.r=Ki(s.r),s.g=Ki(s.g),s.b=Ki(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===ii?Tr:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[o].fromXYZ).multiply(this.spaces[r].toXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[br]:{primaries:t,whitePoint:n,transfer:Tr,toXYZ:xl,fromXYZ:vl,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:ke},outputColorSpaceConfig:{drawingBufferColorSpace:ke}},[ke]:{primaries:t,whitePoint:n,transfer:re,toXYZ:xl,fromXYZ:vl,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:ke}}}),i}const Kt=Ou();function Yn(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Ki(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Ai;class zu{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let n;if(t instanceof HTMLCanvasElement)n=t;else{Ai===void 0&&(Ai=Ar("canvas")),Ai.width=t.width,Ai.height=t.height;const s=Ai.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),n=Ai}return n.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=Ar("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const s=n.getImageData(0,0,t.width,t.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=Yn(r[o]/255)*255;return n.putImageData(s,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Yn(e[n]/255)*255):e[n]=Yn(e[n]);return{data:e,width:t.width,height:t.height}}else return Ot("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let Bu=0;class Ia{constructor(t=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:Bu++}),this.uuid=Kn(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){const e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):typeof VideoFrame<"u"&&e instanceof VideoFrame?t.set(e.displayWidth,e.displayHeight,0):e!==null?t.set(e.width||0,e.height||0,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push($r(s[o].image)):r.push($r(s[o]))}else r=$r(s);n.url=r}return e||(t.images[this.uuid]=n),n}}function $r(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?zu.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Ot("Texture: Unable to serialize Texture."),{})}let Gu=0;const Qr=new R;class $e extends ui{constructor(t=$e.DEFAULT_IMAGE,e=$e.DEFAULT_MAPPING,n=Wn,s=Wn,r=cn,o=ri,a=Pn,l=mn,c=$e.DEFAULT_ANISOTROPY,h=ii){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Gu++}),this.uuid=Kn(),this.name="",this.source=new Ia(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new ot(0,0),this.repeat=new ot(1,1),this.center=new ot(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Bt,this.generateMipmaps=!0,this.mipmapsAutoUpdate=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.isPMREMTexture=!1,this.normalized=!1}get width(){return this.source.getSize(Qr).x}get height(){return this.source.getSize(Qr).y}get depth(){return this.source.getSize(Qr).z}get image(){return this.source.data}set image(t){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.normalized=t.normalized,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.mipmapsAutoUpdate=t.mipmapsAutoUpdate,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isPMREMTexture=t.isPMREMTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(const e in t){const n=t[e];if(n===void 0){Ot(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){Ot(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,mipmapsAutoUpdate:this.mipmapsAutoUpdate,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Ic)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Es:t.x=t.x-Math.floor(t.x);break;case Wn:t.x=t.x<0?0:1;break;case Io:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Es:t.y=t.y-Math.floor(t.y);break;case Wn:t.y=t.y<0?0:1;break;case Io:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}$e.DEFAULT_IMAGE=null;$e.DEFAULT_MAPPING=Ic;$e.DEFAULT_ANISOTROPY=1;const el=class el{constructor(t=0,e=0,n=0,s=1){this.x=t,this.y=e,this.z=n,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,s){return this.x=t,this.y=e,this.z=n,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("THREE.Vector4: index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,s=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*e+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*e+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*e+o[7]*n+o[11]*s+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,s,r;const l=t.elements,c=l[0],h=l[4],u=l[8],d=l[1],f=l[5],_=l[9],M=l[2],p=l[6],m=l[10];if(Math.abs(h-d)<.01&&Math.abs(u-M)<.01&&Math.abs(_-p)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+M)<.1&&Math.abs(_+p)<.1&&Math.abs(c+f+m-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const y=(c+1)/2,v=(f+1)/2,T=(m+1)/2,b=(h+d)/4,g=(u+M)/4,w=(_+p)/4;return y>v&&y>T?y<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(y),s=b/n,r=g/n):v>T?v<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(v),n=b/s,r=w/s):T<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(T),n=g/r,s=w/r),this.set(n,s,r,e),this}let x=Math.sqrt((p-_)*(p-_)+(u-M)*(u-M)+(d-h)*(d-h));return Math.abs(x)<.001&&(x=1),this.x=(p-_)/x,this.y=(u-M)/x,this.z=(d-h)/x,this.w=Math.acos((c+f+m-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Vt(this.x,t.x,e.x),this.y=Vt(this.y,t.y,e.y),this.z=Vt(this.z,t.z,e.z),this.w=Vt(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=Vt(this.x,t,e),this.y=Vt(this.y,t,e),this.z=Vt(this.z,t,e),this.w=Vt(this.w,t,e),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Vt(n,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};el.prototype.isVector4=!0;let xe=el;class ku extends ui{constructor(t=1,e=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:cn,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=n.depth,this.scissor=new xe(0,0,t,e),this.scissorTest=!1,this.viewport=new xe(0,0,t,e),this.textures=[];const s=n.count;for(let r=0;r<s;r++)this.textures[r]=new $e({width:t,height:e,depth:n.depth}),this.textures[r].isRenderTargetTexture=!0,this.textures[r].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(t={}){const e={minFilter:cn,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.mipmapsAutoUpdate!==void 0&&(e.mipmapsAutoUpdate=t.mipmapsAutoUpdate),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),t!==null&&t.renderTarget===null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,n=1){if(this.width!==t||this.height!==e||this.depth!==n){this.width=t,this.height=e,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,n=t.textures.length;e<n;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;const s=Object.assign({},t.textures[e].image);this.textures[e].source=new Ia(s)}if(this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveColorBuffer=t.resolveColorBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,this.storeMultisampledColorBuffer=t.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=t.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=t.storeMultisampledStencilBuffer,t.depthTexture!==null)if(t.depthTexture.renderTarget===t){const e=t.depthTexture.clone();e.renderTarget=null,this.depthTexture=e}else this.depthTexture=t.depthTexture;else this.depthTexture=null;return this.samples=t.samples,this.multiview=t.multiview,this.useArrayDepthTexture=t.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Ln extends ku{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class qc extends $e{constructor(t=null,e=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=Ve,this.minFilter=Ve,this.wrapR=Wn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class Hu extends $e{constructor(t=null,e=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:s},this.magFilter=Ve,this.minFilter=Ve,this.wrapR=Wn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(t){return super.copy(t),this.wrapR=t.wrapR,this}}const Fr=class Fr{constructor(t,e,n,s,r,o,a,l,c,h,u,d,f,_,M,p){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,s,r,o,a,l,c,h,u,d,f,_,M,p)}set(t,e,n,s,r,o,a,l,c,h,u,d,f,_,M,p){const m=this.elements;return m[0]=t,m[4]=e,m[8]=n,m[12]=s,m[1]=r,m[5]=o,m[9]=a,m[13]=l,m[2]=c,m[6]=h,m[10]=u,m[14]=d,m[3]=f,m[7]=_,m[11]=M,m[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Fr().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return this.determinantAffine()===0?(t.set(1,0,0),e.set(0,1,0),n.set(0,0,1),this):(t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){if(t.determinantAffine()===0)return this.identity();const e=this.elements,n=t.elements,s=1/Ri.setFromMatrixColumn(t,0).length(),r=1/Ri.setFromMatrixColumn(t,1).length(),o=1/Ri.setFromMatrixColumn(t,2).length();return e[0]=n[0]*s,e[1]=n[1]*s,e[2]=n[2]*s,e[3]=0,e[4]=n[4]*r,e[5]=n[5]*r,e[6]=n[6]*r,e[7]=0,e[8]=n[8]*o,e[9]=n[9]*o,e[10]=n[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,s=t.y,r=t.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(t.order==="XYZ"){const d=o*h,f=o*u,_=a*h,M=a*u;e[0]=l*h,e[4]=-l*u,e[8]=c,e[1]=f+_*c,e[5]=d-M*c,e[9]=-a*l,e[2]=M-d*c,e[6]=_+f*c,e[10]=o*l}else if(t.order==="YXZ"){const d=l*h,f=l*u,_=c*h,M=c*u;e[0]=d+M*a,e[4]=_*a-f,e[8]=o*c,e[1]=o*u,e[5]=o*h,e[9]=-a,e[2]=f*a-_,e[6]=M+d*a,e[10]=o*l}else if(t.order==="ZXY"){const d=l*h,f=l*u,_=c*h,M=c*u;e[0]=d-M*a,e[4]=-o*u,e[8]=_+f*a,e[1]=f+_*a,e[5]=o*h,e[9]=M-d*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){const d=o*h,f=o*u,_=a*h,M=a*u;e[0]=l*h,e[4]=_*c-f,e[8]=d*c+M,e[1]=l*u,e[5]=M*c+d,e[9]=f*c-_,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){const d=o*l,f=o*c,_=a*l,M=a*c;e[0]=l*h,e[4]=M-d*u,e[8]=_*u+f,e[1]=u,e[5]=o*h,e[9]=-a*h,e[2]=-c*h,e[6]=f*u+_,e[10]=d-M*u}else if(t.order==="XZY"){const d=o*l,f=o*c,_=a*l,M=a*c;e[0]=l*h,e[4]=-u,e[8]=c*h,e[1]=d*u+M,e[5]=o*h,e[9]=f*u-_,e[2]=_*u-f,e[6]=a*h,e[10]=M*u+d}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Vu,t,Wu)}lookAt(t,e,n){const s=this.elements;return dn.subVectors(t,e),dn.lengthSq()===0&&(dn.z=1),dn.normalize(),$n.crossVectors(n,dn),$n.lengthSq()===0&&(Math.abs(n.z)===1?dn.x+=1e-4:dn.z+=1e-4,dn.normalize(),$n.crossVectors(n,dn)),$n.normalize(),Bs.crossVectors(dn,$n),s[0]=$n.x,s[4]=Bs.x,s[8]=dn.x,s[1]=$n.y,s[5]=Bs.y,s[9]=dn.y,s[2]=$n.z,s[6]=Bs.z,s[10]=dn.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,s=e.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],u=n[5],d=n[9],f=n[13],_=n[2],M=n[6],p=n[10],m=n[14],x=n[3],y=n[7],v=n[11],T=n[15],b=s[0],g=s[4],w=s[8],P=s[12],C=s[1],D=s[5],F=s[9],U=s[13],L=s[2],V=s[6],B=s[10],z=s[14],nt=s[3],H=s[7],Q=s[11],it=s[15];return r[0]=o*b+a*C+l*L+c*nt,r[4]=o*g+a*D+l*V+c*H,r[8]=o*w+a*F+l*B+c*Q,r[12]=o*P+a*U+l*z+c*it,r[1]=h*b+u*C+d*L+f*nt,r[5]=h*g+u*D+d*V+f*H,r[9]=h*w+u*F+d*B+f*Q,r[13]=h*P+u*U+d*z+f*it,r[2]=_*b+M*C+p*L+m*nt,r[6]=_*g+M*D+p*V+m*H,r[10]=_*w+M*F+p*B+m*Q,r[14]=_*P+M*U+p*z+m*it,r[3]=x*b+y*C+v*L+T*nt,r[7]=x*g+y*D+v*V+T*H,r[11]=x*w+y*F+v*B+T*Q,r[15]=x*P+y*U+v*z+T*it,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],s=t[8],r=t[12],o=t[1],a=t[5],l=t[9],c=t[13],h=t[2],u=t[6],d=t[10],f=t[14],_=t[3],M=t[7],p=t[11],m=t[15],x=l*f-c*d,y=a*f-c*u,v=a*d-l*u,T=o*f-c*h,b=o*d-l*h,g=o*u-a*h;return e*(M*x-p*y+m*v)-n*(_*x-p*T+m*b)+s*(_*y-M*T+m*g)-r*(_*v-M*b+p*g)}determinantAffine(){const t=this.elements,e=t[0],n=t[4],s=t[8],r=t[1],o=t[5],a=t[9],l=t[2],c=t[6],h=t[10];return e*(o*h-a*c)-n*(r*h-a*l)+s*(r*c-o*l)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],h=t[8],u=t[9],d=t[10],f=t[11],_=t[12],M=t[13],p=t[14],m=t[15],x=e*a-n*o,y=e*l-s*o,v=e*c-r*o,T=n*l-s*a,b=n*c-r*a,g=s*c-r*l,w=h*M-u*_,P=h*p-d*_,C=h*m-f*_,D=u*p-d*M,F=u*m-f*M,U=d*m-f*p,L=x*U-y*F+v*D+T*C-b*P+g*w;if(L===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const V=1/L;return t[0]=(a*U-l*F+c*D)*V,t[1]=(s*F-n*U-r*D)*V,t[2]=(M*g-p*b+m*T)*V,t[3]=(d*b-u*g-f*T)*V,t[4]=(l*C-o*U-c*P)*V,t[5]=(e*U-s*C+r*P)*V,t[6]=(p*v-_*g-m*y)*V,t[7]=(h*g-d*v+f*y)*V,t[8]=(o*F-a*C+c*w)*V,t[9]=(n*C-e*F-r*w)*V,t[10]=(_*b-M*v+m*x)*V,t[11]=(u*v-h*b-f*x)*V,t[12]=(a*P-o*D-l*w)*V,t[13]=(e*D-n*P+s*w)*V,t[14]=(M*y-_*T-p*x)*V,t[15]=(h*T-u*y+d*x)*V,this}scale(t){const e=this.elements,n=t.x,s=t.y,r=t.z;return e[0]*=n,e[4]*=s,e[8]*=r,e[1]*=n,e[5]*=s,e[9]*=r,e[2]*=n,e[6]*=s,e[10]*=r,e[3]*=n,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,s))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),s=Math.sin(e),r=1-n,o=t.x,a=t.y,l=t.z,c=r*o,h=r*a;return this.set(c*o+n,c*a-s*l,c*l+s*a,0,c*a+s*l,h*a+n,h*l-s*o,0,c*l-s*a,h*l+s*o,r*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,s,r,o){return this.set(1,n,r,0,t,1,o,0,e,s,1,0,0,0,0,1),this}compose(t,e,n){const s=this.elements,r=e._x,o=e._y,a=e._z,l=e._w,c=r+r,h=o+o,u=a+a,d=r*c,f=r*h,_=r*u,M=o*h,p=o*u,m=a*u,x=l*c,y=l*h,v=l*u,T=n.x,b=n.y,g=n.z;return s[0]=(1-(M+m))*T,s[1]=(f+v)*T,s[2]=(_-y)*T,s[3]=0,s[4]=(f-v)*b,s[5]=(1-(d+m))*b,s[6]=(p+x)*b,s[7]=0,s[8]=(_+y)*g,s[9]=(p-x)*g,s[10]=(1-(d+M))*g,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,n){const s=this.elements;t.x=s[12],t.y=s[13],t.z=s[14];const r=this.determinantAffine();if(r===0)return n.set(1,1,1),e.identity(),this;let o=Ri.set(s[0],s[1],s[2]).length();const a=Ri.set(s[4],s[5],s[6]).length(),l=Ri.set(s[8],s[9],s[10]).length();r<0&&(o=-o),Sn.copy(this);const c=1/o,h=1/a,u=1/l;return Sn.elements[0]*=c,Sn.elements[1]*=c,Sn.elements[2]*=c,Sn.elements[4]*=h,Sn.elements[5]*=h,Sn.elements[6]*=h,Sn.elements[8]*=u,Sn.elements[9]*=u,Sn.elements[10]*=u,e.setFromRotationMatrix(Sn),n.x=o,n.y=a,n.z=l,this}makePerspective(t,e,n,s,r,o,a=En,l=!1){const c=this.elements,h=2*r/(e-t),u=2*r/(n-s),d=(e+t)/(e-t),f=(n+s)/(n-s);let _,M;if(l)_=r/(o-r),M=o*r/(o-r);else if(a===En)_=-(o+r)/(o-r),M=-2*o*r/(o-r);else if(a===Ts)_=-o/(o-r),M=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=_,c[14]=M,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,n,s,r,o,a=En,l=!1){const c=this.elements,h=2/(e-t),u=2/(n-s),d=-(e+t)/(e-t),f=-(n+s)/(n-s);let _,M;if(l)_=1/(o-r),M=o/(o-r);else if(a===En)_=-2/(o-r),M=-(o+r)/(o-r);else if(a===Ts)_=-1/(o-r),M=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=_,c[14]=M,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let s=0;s<16;s++)if(e[s]!==n[s])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}};Fr.prototype.isMatrix4=!0;let he=Fr;const Ri=new R,Sn=new he,Vu=new R(0,0,0),Wu=new R(1,1,1),$n=new R,Bs=new R,dn=new R,Ml=new he,Sl=new ci;class hi{constructor(t=0,e=0,n=0,s=hi.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,s=this._order){return this._x=t,this._y=e,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const s=t.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],h=s[9],u=s[2],d=s[6],f=s[10];switch(e){case"XYZ":this._y=Math.asin(Vt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Vt(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(Vt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Vt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Vt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-Vt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Ot("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return Ml.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Ml,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Sl.setFromEuler(this),this.setFromQuaternion(Sl,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}hi.DEFAULT_ORDER="XYZ";class Zc{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let Xu=0;const yl=new R,Ci=new ci,On=new he,Gs=new R,ss=new R,Yu=new R,qu=new ci,wl=new R(1,0,0),El=new R(0,1,0),bl=new R(0,0,1),Tl={type:"added"},Zu={type:"removed"},Pi={type:"childadded",child:null},jr={type:"childremoved",child:null};class De extends ui{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Xu++}),this.uuid=Kn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=De.DEFAULT_UP.clone();const t=new R,e=new hi,n=new ci,s=new R(1,1,1);function r(){n.setFromEuler(e,!1)}function o(){e.setFromQuaternion(n,void 0,!1)}e._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new he},normalMatrix:{value:new Bt}}),this.matrix=new he,this.matrixWorld=new he,this.matrixAutoUpdate=De.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=De.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Zc,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale),this.pivot!==null&&this.position.copy(this.pivot).applyMatrix4(this.matrix).sub(this.pivot)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Ci.setFromAxisAngle(t,e),this.quaternion.multiply(Ci),this}rotateOnWorldAxis(t,e){return Ci.setFromAxisAngle(t,e),this.quaternion.premultiply(Ci),this}rotateX(t){return this.rotateOnAxis(wl,t)}rotateY(t){return this.rotateOnAxis(El,t)}rotateZ(t){return this.rotateOnAxis(bl,t)}translateOnAxis(t,e){return yl.copy(t).applyQuaternion(this.quaternion),this.position.add(yl.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(wl,t)}translateY(t){return this.translateOnAxis(El,t)}translateZ(t){return this.translateOnAxis(bl,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(On.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?Gs.copy(t):Gs.set(t,e,n);const s=this.parent;this.updateWorldMatrix(!0,!1),ss.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?On.lookAt(ss,Gs,this.up):On.lookAt(Gs,ss,this.up),this.quaternion.setFromRotationMatrix(On),s&&(On.extractRotation(s.matrixWorld),Ci.setFromRotationMatrix(On),this.quaternion.premultiply(Ci.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(Qt("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(Tl),Pi.child=t,this.dispatchEvent(Pi),Pi.child=null):Qt("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(Zu),jr.child=t,this.dispatchEvent(jr),jr.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),On.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),On.multiply(t.parent.matrixWorld)),t.applyMatrix4(On),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(Tl),Pi.child=t,this.dispatchEvent(Pi),Pi.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,s=this.children.length;n<s;n++){const o=this.children[n].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ss,t,Yu),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ss,qu,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}intersectsFrustum(){return!0}traverse(t){t(this);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const t=this.pivot;if(t!==null){const e=t.x,n=t.y,s=t.z,r=this.matrix.elements;r[12]+=e-r[0]*e-r[4]*n-r[8]*s,r[13]+=n-r[1]*e-r[5]*n-r[9]*s,r[14]+=s-r[2]*e-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,s=e.length;n<s;n++)e[n].updateMatrixWorld(t)}updateWorldMatrix(t,e,n=!1){const s=this.parent;if(t===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),e===!0){const r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,n)}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,s.name=this.name,s.castShadow=this.castShadow,s.receiveShadow=this.receiveShadow,s.visible=this.visible,s.frustumCulled=this.frustumCulled,s.renderOrder=this.renderOrder,s.static=this.static,s.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const u=l[c];r(t.shapes,u)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(t.materials,this.material[l]));s.material=a}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];s.animations.push(r(t.animations,l))}}if(e){const a=o(t.geometries),l=o(t.materials),c=o(t.textures),h=o(t.images),u=o(t.shapes),d=o(t.skeletons),f=o(t.animations),_=o(t.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),_.length>0&&(n.nodes=_)}return n.object=s,n;function o(a){const l=[];for(const c in a){const h=a[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.pivot=t.pivot!==null?t.pivot.clone():null,this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.static=t.static,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const s=t.children[n];this.add(s.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}}De.DEFAULT_UP=new R(0,1,0);De.DEFAULT_MATRIX_AUTO_UPDATE=!0;De.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class ee extends De{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Ku={type:"move"};class to{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new ee,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new ee,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new R,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new R),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new ee,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new R,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new R,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let s=null,r=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(const M of t.hand.values()){const p=e.getJointPose(M,n),m=this._getHandJoint(c,M);p!==null&&(m.matrix.fromArray(p.transform.matrix),m.matrix.decompose(m.position,m.quaternion,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=p.radius),m.visible=p!==null}const h=c.joints["index-finger-tip"],u=c.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,_=.005;c.inputState.pinching&&d>f+_?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&d<=f-_&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.quaternion,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:t,target:this})));a!==null&&(s=e.getPose(t.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.quaternion,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Ku)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new ee;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}const Kc={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Qn={h:0,s:0,l:0},ks={h:0,s:0,l:0};function eo(i,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?i+(t-i)*6*e:e<1/2?t:e<2/3?i+(t-i)*6*(2/3-e):i}class wt{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=ke){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,Kt.colorSpaceToWorking(this,e),this}setRGB(t,e,n,s=Kt.workingColorSpace){return this.r=t,this.g=e,this.b=n,Kt.colorSpaceToWorking(this,s),this}setHSL(t,e,n,s=Kt.workingColorSpace){if(t=Pa(t,1),e=Vt(e,0,1),n=Vt(n,0,1),e===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+e):n+e-n*e,o=2*n-r;this.r=eo(o,r,t+1/3),this.g=eo(o,r,t),this.b=eo(o,r,t-1/3)}return Kt.colorSpaceToWorking(this,s),this}setStyle(t,e=ke){function n(r){r!==void 0&&parseFloat(r)<1&&Ot("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r;const o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseFloat(r[1]))/100,Math.min(100,parseFloat(r[2]))/100,Math.min(100,parseFloat(r[3]))/100,e);break;case"hsl":case"hsla":if(r=/^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:Ot("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){const r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);Ot("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=ke){const n=Kc[t.toLowerCase()];return n!==void 0?this.setHex(n,e):Ot("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Yn(t.r),this.g=Yn(t.g),this.b=Yn(t.b),this}copyLinearToSRGB(t){return this.r=Ki(t.r),this.g=Ki(t.g),this.b=Ki(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=ke){return Kt.workingToColorSpace(qe.copy(this),t),Math.round(Vt(qe.r*255,0,255))*65536+Math.round(Vt(qe.g*255,0,255))*256+Math.round(Vt(qe.b*255,0,255))}getHexString(t=ke){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=Kt.workingColorSpace){Kt.workingToColorSpace(qe.copy(this),e);const n=qe.r,s=qe.g,r=qe.b,o=Math.max(n,s,r),a=Math.min(n,s,r);let l,c;const h=(a+o)/2;if(a===o)l=0,c=0;else{const u=o-a;switch(c=h<=.5?u/(o+a):u/(2-o-a),o){case n:l=(s-r)/u+(s<r?6:0);break;case s:l=(r-n)/u+2;break;case r:l=(n-s)/u+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=Kt.workingColorSpace){return Kt.workingToColorSpace(qe.copy(this),e),t.r=qe.r,t.g=qe.g,t.b=qe.b,t}getStyle(t=ke){Kt.workingToColorSpace(qe.copy(this),t);const e=qe.r,n=qe.g,s=qe.b;return t!==ke?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(t,e,n){return this.getHSL(Qn),this.setHSL(Qn.h+t,Qn.s+e,Qn.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Qn),t.getHSL(ks);const n=xs(Qn.h,ks.h,e),s=xs(Qn.s,ks.s,e),r=xs(Qn.l,ks.l,e);return this.setHSL(n,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*n+r[6]*s,this.g=r[1]*e+r[4]*n+r[7]*s,this.b=r[2]*e+r[5]*n+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const qe=new wt;wt.NAMES=Kc;class Na{constructor(t,e=25e-5){this.isFogExp2=!0,this.name="",this.color=new wt(t),this.density=e}clone(){return new Na(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class Ju extends De{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new hi,this.environmentIntensity=1,this.environmentRotation=new hi,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),this.background=t.background!==null?t.background.clone():null,this.environment=t.environment!==null?t.environment.clone():null,this.fog=t.fog!==null?t.fog.clone():null,this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),this.overrideMaterial=t.overrideMaterial!==null?t.overrideMaterial.clone():null,this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),e.object.backgroundBlurriness=this.backgroundBlurriness,e.object.backgroundIntensity=this.backgroundIntensity,e.object.backgroundRotation=this.backgroundRotation.toArray(),e.object.environmentIntensity=this.environmentIntensity,e.object.environmentRotation=this.environmentRotation.toArray(),e}}const yn=new R,zn=new R,no=new R,Bn=new R,Li=new R,Di=new R,Al=new R,io=new R,so=new R,ro=new R,oo=new xe,ao=new xe,lo=new xe;class xn{constructor(t=new R,e=new R,n=new R){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,s){s.subVectors(n,e),yn.subVectors(t,e),s.cross(yn);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,n,s,r){yn.subVectors(s,e),zn.subVectors(n,e),no.subVectors(t,e);const o=yn.dot(yn),a=yn.dot(zn),l=yn.dot(no),c=zn.dot(zn),h=zn.dot(no),u=o*c-a*a;if(u===0)return r.set(0,0,0),null;const d=1/u,f=(c*l-a*h)*d,_=(o*h-a*l)*d;return r.set(1-f-_,_,f)}static containsPoint(t,e,n,s){return this.getBarycoord(t,e,n,s,Bn)===null?!1:Bn.x>=0&&Bn.y>=0&&Bn.x+Bn.y<=1}static getInterpolation(t,e,n,s,r,o,a,l){return this.getBarycoord(t,e,n,s,Bn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Bn.x),l.addScaledVector(o,Bn.y),l.addScaledVector(a,Bn.z),l)}static getInterpolatedAttribute(t,e,n,s,r,o){return oo.setScalar(0),ao.setScalar(0),lo.setScalar(0),oo.fromBufferAttribute(t,e),ao.fromBufferAttribute(t,n),lo.fromBufferAttribute(t,s),o.setScalar(0),o.addScaledVector(oo,r.x),o.addScaledVector(ao,r.y),o.addScaledVector(lo,r.z),o}static isFrontFacing(t,e,n,s){return yn.subVectors(n,e),zn.subVectors(t,e),yn.cross(zn).dot(s)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,s){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,n,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return yn.subVectors(this.c,this.b),zn.subVectors(this.a,this.b),yn.cross(zn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return xn.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return xn.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,n,s,r){return xn.getInterpolation(t,this.a,this.b,this.c,e,n,s,r)}containsPoint(t){return xn.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return xn.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,s=this.b,r=this.c;let o,a;Li.subVectors(s,n),Di.subVectors(r,n),io.subVectors(t,n);const l=Li.dot(io),c=Di.dot(io);if(l<=0&&c<=0)return e.copy(n);so.subVectors(t,s);const h=Li.dot(so),u=Di.dot(so);if(h>=0&&u<=h)return e.copy(s);const d=l*u-h*c;if(d<=0&&l>=0&&h<=0&&l-h>0)return o=l/(l-h),e.copy(n).addScaledVector(Li,o);ro.subVectors(t,r);const f=Li.dot(ro),_=Di.dot(ro);if(_>=0&&f<=_)return e.copy(r);const M=f*c-l*_;if(M<=0&&c>=0&&_<=0)return a=c/(c-_),e.copy(n).addScaledVector(Di,a);const p=h*_-f*u;if(p<=0&&u-h>=0&&f-_>=0)return Al.subVectors(r,s),a=(u-h)/(u-h+(f-_)),e.copy(s).addScaledVector(Al,a);const m=1/(p+M+d);return o=M*m,a=d*m,e.copy(n).addScaledVector(Li,o).addScaledVector(Di,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}class Is{constructor(t=new R(1/0,1/0,1/0),e=new R(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(wn.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(wn.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=wn.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const r=n.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0&&t.isBatchedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,wn):wn.fromBufferAttribute(r,o),wn.applyMatrix4(t.matrixWorld),this.expandByPoint(wn);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Hs.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Hs.copy(n.boundingBox)),Hs.applyMatrix4(t.matrixWorld),this.union(Hs)}const s=t.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,wn),wn.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(rs),Vs.subVectors(this.max,rs),Ii.subVectors(t.a,rs),Ni.subVectors(t.b,rs),Ui.subVectors(t.c,rs),jn.subVectors(Ni,Ii),ti.subVectors(Ui,Ni),mi.subVectors(Ii,Ui);let e=[0,-jn.z,jn.y,0,-ti.z,ti.y,0,-mi.z,mi.y,jn.z,0,-jn.x,ti.z,0,-ti.x,mi.z,0,-mi.x,-jn.y,jn.x,0,-ti.y,ti.x,0,-mi.y,mi.x,0];return!co(e,Ii,Ni,Ui,Vs)||(e=[1,0,0,0,1,0,0,0,1],!co(e,Ii,Ni,Ui,Vs))?!1:(Ws.crossVectors(jn,ti),e=[Ws.x,Ws.y,Ws.z],co(e,Ii,Ni,Ui,Vs))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,wn).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(wn).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(Gn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),Gn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),Gn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),Gn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),Gn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),Gn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),Gn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),Gn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(Gn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}}const Gn=[new R,new R,new R,new R,new R,new R,new R,new R],wn=new R,Hs=new Is,Ii=new R,Ni=new R,Ui=new R,jn=new R,ti=new R,mi=new R,rs=new R,Vs=new R,Ws=new R,gi=new R;function co(i,t,e,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){gi.fromArray(i,r);const a=s.x*Math.abs(gi.x)+s.y*Math.abs(gi.y)+s.z*Math.abs(gi.z),l=t.dot(gi),c=e.dot(gi),h=n.dot(gi);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}const Te=new R,Xs=new ot;let $u=0;class hn extends ui{constructor(t,e,n=!1){if(super(),Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:$u++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Wc,this.updateRanges=[],this.gpuType=Cn,this.version=0,this._normalizationScale=t!==void 0?Or(t):void 0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this._normalizationScale=t._normalizationScale,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[n+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)Xs.fromBufferAttribute(this,e),Xs.applyMatrix3(t),this.setXY(e,Xs.x,Xs.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)Te.fromBufferAttribute(this,e),Te.applyMatrix3(t),this.setXYZ(e,Te.x,Te.y,Te.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)Te.fromBufferAttribute(this,e),Te.applyMatrix4(t),this.setXYZ(e,Te.x,Te.y,Te.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)Te.fromBufferAttribute(this,e),Te.applyNormalMatrix(t),this.setXYZ(e,Te.x,Te.y,Te.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)Te.fromBufferAttribute(this,e),Te.transformDirection(t),this.setXYZ(e,Te.x,Te.y,Te.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=this._denormalize(n)),n}setComponent(t,e,n){return this.normalized&&(n=this._normalize(n)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=this._denormalize(e)),e}setX(t,e){return this.normalized&&(e=this._normalize(e)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=this._denormalize(e)),e}setY(t,e){return this.normalized&&(e=this._normalize(e)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=this._denormalize(e)),e}setZ(t,e){return this.normalized&&(e=this._normalize(e)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=this._denormalize(e)),e}setW(t,e){return this.normalized&&(e=this._normalize(e)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=this._normalize(e),n=this._normalize(n)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,s){return t*=this.itemSize,this.normalized&&(e=this._normalize(e),n=this._normalize(n),s=this._normalize(s)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t*=this.itemSize,this.normalized&&(e=this._normalize(e),n=this._normalize(n),s=this._normalize(s),r=this._normalize(r)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return t.name=this.name,t.usage=this.usage,t.gpuType=this.gpuType,t}dispose(){this.dispatchEvent({type:"dispose"})}_denormalize(t){const e=this._normalizationScale;return e!==void 0?Math.max(t/e,-1):La(t,this.array)}_normalize(t){const e=this._normalizationScale;return e!==void 0?Math.round(t*e):Da(t,this.array)}}class Jc extends hn{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class $c extends hn{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class Ht extends hn{constructor(t,e,n){super(new Float32Array(t),e,n)}}const Qu=new Is,os=new R,ho=new R;class zr{constructor(t=new R,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):Qu.setFromPoints(t).getCenter(n);let s=0;for(let r=0,o=t.length;r<o;r++)s=Math.max(s,n.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;os.subVectors(t,this.center);const e=os.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),s=(n-this.radius)*.5;this.center.addScaledVector(os,s/n),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(ho.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(os.copy(t.center).add(ho)),this.expandByPoint(os.copy(t.center).sub(ho))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}}let ju=0;const gn=new he,uo=new De,Fi=new R,fn=new Is,as=new Is,Oe=new R;class Me extends ui{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:ju++}),this.uuid=Kn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(xu(t)?$c:Jc)(t,1):this.index=t,this}setIndirect(t,e=0){return this.indirect=t,this.indirectOffset=e,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new Bt().getNormalMatrix(t);n.applyNormalMatrix(r),n.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(t){return gn.makeRotationFromQuaternion(t),this.applyMatrix4(gn),this}rotateX(t){return gn.makeRotationX(t),this.applyMatrix4(gn),this}rotateY(t){return gn.makeRotationY(t),this.applyMatrix4(gn),this}rotateZ(t){return gn.makeRotationZ(t),this.applyMatrix4(gn),this}translate(t,e,n){return gn.makeTranslation(t,e,n),this.applyMatrix4(gn),this}scale(t,e,n){return gn.makeScale(t,e,n),this.applyMatrix4(gn),this}lookAt(t){return uo.lookAt(t),uo.updateMatrix(),this.applyMatrix4(uo.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Fi).negate(),this.translate(Fi.x,Fi.y,Fi.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const n=[];for(let s=0,r=t.length;s<r;s++){const o=t[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Ht(n,3))}else{const n=Math.min(t.length,e.count);for(let s=0;s<n;s++){const r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&Ot("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Is);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Qt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new R(-1/0,-1/0,-1/0),new R(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,s=e.length;n<s;n++){const r=e[n];fn.setFromBufferAttribute(r),this.morphTargetsRelative?(Oe.addVectors(this.boundingBox.min,fn.min),this.boundingBox.expandByPoint(Oe),Oe.addVectors(this.boundingBox.max,fn.max),this.boundingBox.expandByPoint(Oe)):(this.boundingBox.expandByPoint(fn.min),this.boundingBox.expandByPoint(fn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Qt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new zr);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Qt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new R,1/0);return}if(t){const n=this.boundingSphere.center;if(fn.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){const a=e[r];as.setFromBufferAttribute(a),this.morphTargetsRelative?(Oe.addVectors(fn.min,as.min),fn.expandByPoint(Oe),Oe.addVectors(fn.max,as.max),fn.expandByPoint(Oe)):(fn.expandByPoint(as.min),fn.expandByPoint(as.max))}fn.getCenter(n);let s=0;for(let r=0,o=t.count;r<o;r++)Oe.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(Oe));if(e)for(let r=0,o=e.length;r<o;r++){const a=e[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)Oe.fromBufferAttribute(a,c),l&&(Fi.fromBufferAttribute(t,c),Oe.add(Fi)),s=Math.max(s,n.distanceToSquared(Oe))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Qt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){Qt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=e.position,s=e.normal,r=e.uv;let o=this.getAttribute("tangent");(o===void 0||o.count!==n.count)&&(o=new hn(new Float32Array(4*n.count),4),this.setAttribute("tangent",o));const a=[],l=[],c=new Uint8Array(n.count);for(let P=0;P<n.count;P++)a[P]=new R,l[P]=new R;const h=new R,u=new R,d=new R,f=new ot,_=new ot,M=new ot,p=new R,m=new R;function x(P,C,D){c[P]=c[C]=c[D]=1,h.fromBufferAttribute(n,P),u.fromBufferAttribute(n,C),d.fromBufferAttribute(n,D),f.fromBufferAttribute(r,P),_.fromBufferAttribute(r,C),M.fromBufferAttribute(r,D),u.sub(h),d.sub(h),_.sub(f),M.sub(f);const F=1/(_.x*M.y-M.x*_.y);isFinite(F)&&(p.copy(u).multiplyScalar(M.y).addScaledVector(d,-_.y).multiplyScalar(F),m.copy(d).multiplyScalar(_.x).addScaledVector(u,-M.x).multiplyScalar(F),a[P].add(p),a[C].add(p),a[D].add(p),l[P].add(m),l[C].add(m),l[D].add(m))}let y=this.groups;y.length===0&&(y=[{start:0,count:t.count}]);for(let P=0,C=y.length;P<C;++P){const D=y[P],F=D.start,U=D.count;for(let L=F,V=F+U;L<V;L+=3)x(t.getX(L+0),t.getX(L+1),t.getX(L+2))}const v=new R,T=new R,b=new R,g=new R;function w(P){b.fromBufferAttribute(s,P),g.copy(b);const C=a[P];v.copy(C),v.sub(b.multiplyScalar(b.dot(C))).normalize(),T.crossVectors(g,C);const F=T.dot(l[P])<0?-1:1;o.setXYZW(P,v.x,v.y,v.z,F)}for(let P=0,C=n.count;P<C;++P)c[P]&&w(P);this._transformed=!0}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==e.count)n=new hn(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);const s=new R,r=new R,o=new R,a=new R,l=new R,c=new R,h=new R,u=new R;if(t)for(let d=0,f=t.count;d<f;d+=3){const _=t.getX(d+0),M=t.getX(d+1),p=t.getX(d+2);s.fromBufferAttribute(e,_),r.fromBufferAttribute(e,M),o.fromBufferAttribute(e,p),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),a.fromBufferAttribute(n,_),l.fromBufferAttribute(n,M),c.fromBufferAttribute(n,p),a.add(h),l.add(h),c.add(h),n.setXYZ(_,a.x,a.y,a.z),n.setXYZ(M,l.x,l.y,l.z),n.setXYZ(p,c.x,c.y,c.z)}else for(let d=0,f=e.count;d<f;d+=3)s.fromBufferAttribute(e,d+0),r.fromBufferAttribute(e,d+1),o.fromBufferAttribute(e,d+2),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)Oe.fromBufferAttribute(t,e),Oe.normalize(),t.setXYZ(e,Oe.x,Oe.y,Oe.z)}toNonIndexed(){function t(a,l){const c=a.array,h=a.itemSize,u=a.normalized,d=new c.constructor(l.length*h);let f=0,_=0;for(let M=0,p=l.length;M<p;M++){a.isInterleavedBufferAttribute?f=l[M]*a.data.stride+a.offset:f=l[M]*h;for(let m=0;m<h;m++)d[_++]=c[f++]}return new hn(d,h,u)}if(this.index===null)return Ot("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new Me,n=this.index.array,s=this.attributes;for(const a in s){const l=s[a],c=t(l,n);e.setAttribute(a,c)}const r=this.morphAttributes;for(const a in r){const l=[],c=r[a];for(let h=0,u=c.length;h<u;h++){const d=c[h],f=t(d,n);l.push(f)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){const t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,t.name=this.name,Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const l in n){const c=n[l];t.data.attributes[l]=c.toJSON(t.data)}const s={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let u=0,d=c.length;u<d;u++){const f=c[u];h.push(f.toJSON(t.data))}h.length>0&&(s[l]=h,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(t.data.boundingSphere=a.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone());const s=t.attributes;for(const c in s){const h=s[c];this.setAttribute(c,h.clone(e))}const r=t.morphAttributes;for(const c in r){const h=[],u=r[c];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;const o=t.groups;for(let c=0,h=o.length;c<h;c++){const u=o[c];this.addGroup(u.start,u.count,u.materialIndex)}const a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this._transformed=t._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}class td{constructor(t,e){this.isInterleavedBuffer=!0,this.array=t,this.stride=e,this.count=t!==void 0?t.length/e:0,this.usage=Wc,this.updateRanges=[],this.version=0,this.uuid=Kn()}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.array=new t.array.constructor(t.array),this.count=t.count,this.stride=t.stride,this.usage=t.usage,this}copyAt(t,e,n){t*=this.stride,n*=e.stride;for(let s=0,r=this.stride;s<r;s++)this.array[t+s]=e.array[n+s];return this}set(t,e=0){return this.array.set(t,e),this}clone(t){t.arrayBuffers===void 0&&(t.arrayBuffers={});const e=Rl(this.array);t.arrayBuffers[e]===void 0&&(t.arrayBuffers[e]=this.array.slice(0).buffer);const n=new this.array.constructor(t.arrayBuffers[e]),s=new this.constructor(n,this.stride);return s.setUsage(this.usage),s}onUpload(t){return this.onUploadCallback=t,this}toJSON(t){t.arrayBuffers===void 0&&(t.arrayBuffers={});const e=Rl(this.array);t.arrayBuffers[e]===void 0&&(t.arrayBuffers[e]=Array.from(new Uint32Array(this.array.slice(0).buffer)));const n={uuid:this.uuid,buffer:e,type:this.array.constructor.name,stride:this.stride};return n.usage=this.usage,n}}function Rl(i){return i.buffer._uuid===void 0&&(i.buffer._uuid=Kn()),i.byteOffset===0&&i.byteLength===i.buffer.byteLength?i.buffer._uuid:i.buffer._uuid+":"+i.byteOffset+":"+i.byteLength}const je=new R;class Cr{constructor(t,e,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=t,this.itemSize=e,this.offset=n,this.normalized=s,this._normalizationScale=t!==void 0?Or(t.array):void 0}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(t){this.data.needsUpdate=t}applyMatrix4(t){for(let e=0,n=this.data.count;e<n;e++)je.fromBufferAttribute(this,e),je.applyMatrix4(t),this.setXYZ(e,je.x,je.y,je.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)je.fromBufferAttribute(this,e),je.applyNormalMatrix(t),this.setXYZ(e,je.x,je.y,je.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)je.fromBufferAttribute(this,e),je.transformDirection(t),this.setXYZ(e,je.x,je.y,je.z);return this}getComponent(t,e){let n=this.array[t*this.data.stride+this.offset+e];return this.normalized&&(n=this._denormalize(n)),n}setComponent(t,e,n){return this.normalized&&(n=this._normalize(n)),this.data.array[t*this.data.stride+this.offset+e]=n,this}setX(t,e){return this.normalized&&(e=this._normalize(e)),this.data.array[t*this.data.stride+this.offset]=e,this}setY(t,e){return this.normalized&&(e=this._normalize(e)),this.data.array[t*this.data.stride+this.offset+1]=e,this}setZ(t,e){return this.normalized&&(e=this._normalize(e)),this.data.array[t*this.data.stride+this.offset+2]=e,this}setW(t,e){return this.normalized&&(e=this._normalize(e)),this.data.array[t*this.data.stride+this.offset+3]=e,this}getX(t){let e=this.data.array[t*this.data.stride+this.offset];return this.normalized&&(e=this._denormalize(e)),e}getY(t){let e=this.data.array[t*this.data.stride+this.offset+1];return this.normalized&&(e=this._denormalize(e)),e}getZ(t){let e=this.data.array[t*this.data.stride+this.offset+2];return this.normalized&&(e=this._denormalize(e)),e}getW(t){let e=this.data.array[t*this.data.stride+this.offset+3];return this.normalized&&(e=this._denormalize(e)),e}setXY(t,e,n){return t=t*this.data.stride+this.offset,this.normalized&&(e=this._normalize(e),n=this._normalize(n)),this.data.array[t+0]=e,this.data.array[t+1]=n,this}setXYZ(t,e,n,s){return t=t*this.data.stride+this.offset,this.normalized&&(e=this._normalize(e),n=this._normalize(n),s=this._normalize(s)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=s,this}setXYZW(t,e,n,s,r){return t=t*this.data.stride+this.offset,this.normalized&&(e=this._normalize(e),n=this._normalize(n),s=this._normalize(s),r=this._normalize(r)),this.data.array[t+0]=e,this.data.array[t+1]=n,this.data.array[t+2]=s,this.data.array[t+3]=r,this}clone(t){if(t===void 0){Rr("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const e=[];for(let n=0;n<this.count;n++){const s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return new hn(new this.array.constructor(e),this.itemSize,this.normalized)}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new Cr(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(t){if(t===void 0){Rr("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const e=[];for(let n=0;n<this.count;n++){const s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)e.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}else return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.toJSON(t)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}_denormalize(t){const e=this._normalizationScale;return e!==void 0?Math.max(t/e,-1):La(t,this.data.array)}_normalize(t){const e=this._normalizationScale;return e!==void 0?Math.round(t*e):Da(t,this.data.array)}}const fo=new R,ed=new R,nd=new Bt;class Hn{constructor(t=new R(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,s){return this.normal.set(t,e,n),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const s=fo.subVectors(n,e).cross(ed.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e,n=!0){const s=t.delta(fo),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const o=-(t.start.dot(this.normal)+this.constant)/r;return n===!0&&(o<0||o>1)?null:e.copy(t.start).addScaledVector(s,o)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||nd.getNormalMatrix(t),s=this.coplanarPoint(fo).applyMatrix4(t),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(t){return this.normal.fromArray(t.normal),this.constant=t.constant,this}}let id=0;class bi extends ui{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:id++}),this.uuid=Kn(),this.name="",this.type="Material",this.blending=Si,this.side=yi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Ec,this.blendDst=bc,this.blendEquation=Wi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new wt(0,0,0),this.blendAlpha=0,this.depthFunc=ys,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=du,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Zr,this.stencilZFail=Zr,this.stencilZPass=Zr,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){Ot(`Material: parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){Ot(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.diffuseRoughness!==void 0&&(n.diffuseRoughness=this.diffuseRoughness),this.diffuseRoughnessMap&&this.diffuseRoughnessMap.isTexture&&(n.diffuseRoughnessMap=this.diffuseRoughnessMap.toJSON(t).uuid),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessMinimum!==void 0&&(n.iridescenceThicknessMinimum=this.iridescenceThicknessMinimum),this.iridescenceThicknessMaximum!==void 0&&(n.iridescenceThicknessMaximum=this.iridescenceThicknessMaximum),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(r=>r.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){const o=[];for(const a in r){const l=r[a];delete l.metadata,o.push(l)}return o}if(e){const r=s(t.textures),o=s(t.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}fromJSON(t,e){if(t.uuid!==void 0&&(this.uuid=t.uuid),t.name!==void 0&&(this.name=t.name),t.color!==void 0&&this.color!==void 0&&this.color.setHex(t.color),t.roughness!==void 0&&(this.roughness=t.roughness),t.metalness!==void 0&&(this.metalness=t.metalness),t.sheen!==void 0&&(this.sheen=t.sheen),t.sheenColor!==void 0&&(this.sheenColor=new wt().setHex(t.sheenColor)),t.sheenRoughness!==void 0&&(this.sheenRoughness=t.sheenRoughness),t.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(t.emissive),t.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(t.specular),t.specularIntensity!==void 0&&(this.specularIntensity=t.specularIntensity),t.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(t.specularColor),t.shininess!==void 0&&(this.shininess=t.shininess),t.clearcoat!==void 0&&(this.clearcoat=t.clearcoat),t.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=t.clearcoatRoughness),t.diffuseRoughness!==void 0&&(this.diffuseRoughness=t.diffuseRoughness),t.dispersion!==void 0&&(this.dispersion=t.dispersion),t.retroreflectivity!==void 0&&(this.retroreflectivity=t.retroreflectivity),t.iridescence!==void 0&&(this.iridescence=t.iridescence),t.iridescenceIOR!==void 0&&(this.iridescenceIOR=t.iridescenceIOR),t.iridescenceThicknessMinimum!==void 0&&(this.iridescenceThicknessMinimum=t.iridescenceThicknessMinimum),t.iridescenceThicknessMaximum!==void 0&&(this.iridescenceThicknessMaximum=t.iridescenceThicknessMaximum),t.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessMinimum=t.iridescenceThicknessRange[0],this.iridescenceThicknessMaximum=t.iridescenceThicknessRange[1]),t.transmission!==void 0&&(this.transmission=t.transmission),t.thickness!==void 0&&(this.thickness=t.thickness),t.attenuationDistance!==void 0&&(this.attenuationDistance=t.attenuationDistance),t.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(t.attenuationColor),t.anisotropy!==void 0&&(this.anisotropy=t.anisotropy),t.anisotropyRotation!==void 0&&(this.anisotropyRotation=t.anisotropyRotation),t.fog!==void 0&&(this.fog=t.fog),t.flatShading!==void 0&&(this.flatShading=t.flatShading),t.blending!==void 0&&(this.blending=t.blending),t.combine!==void 0&&(this.combine=t.combine),t.side!==void 0&&(this.side=t.side),t.shadowSide!==void 0&&(this.shadowSide=t.shadowSide),t.opacity!==void 0&&(this.opacity=t.opacity),t.transparent!==void 0&&(this.transparent=t.transparent),t.alphaTest!==void 0&&(this.alphaTest=t.alphaTest),t.alphaHash!==void 0&&(this.alphaHash=t.alphaHash),t.depthFunc!==void 0&&(this.depthFunc=t.depthFunc),t.depthTest!==void 0&&(this.depthTest=t.depthTest),t.depthWrite!==void 0&&(this.depthWrite=t.depthWrite),t.colorWrite!==void 0&&(this.colorWrite=t.colorWrite),t.clippingPlanes!==void 0&&(this.clippingPlanes=t.clippingPlanes.map(n=>new Hn().fromJSON(n))),t.clipIntersection!==void 0&&(this.clipIntersection=t.clipIntersection),t.clipShadows!==void 0&&(this.clipShadows=t.clipShadows),t.depthPacking!==void 0&&(this.depthPacking=t.depthPacking),t.blendSrc!==void 0&&(this.blendSrc=t.blendSrc),t.blendDst!==void 0&&(this.blendDst=t.blendDst),t.blendEquation!==void 0&&(this.blendEquation=t.blendEquation),t.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=t.blendSrcAlpha),t.blendDstAlpha!==void 0&&(this.blendDstAlpha=t.blendDstAlpha),t.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=t.blendEquationAlpha),t.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(t.blendColor),t.blendAlpha!==void 0&&(this.blendAlpha=t.blendAlpha),t.stencilWriteMask!==void 0&&(this.stencilWriteMask=t.stencilWriteMask),t.stencilFunc!==void 0&&(this.stencilFunc=t.stencilFunc),t.stencilRef!==void 0&&(this.stencilRef=t.stencilRef),t.stencilFuncMask!==void 0&&(this.stencilFuncMask=t.stencilFuncMask),t.stencilFail!==void 0&&(this.stencilFail=t.stencilFail),t.stencilZFail!==void 0&&(this.stencilZFail=t.stencilZFail),t.stencilZPass!==void 0&&(this.stencilZPass=t.stencilZPass),t.stencilWrite!==void 0&&(this.stencilWrite=t.stencilWrite),t.wireframe!==void 0&&(this.wireframe=t.wireframe),t.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=t.wireframeLinewidth),t.wireframeLinecap!==void 0&&(this.wireframeLinecap=t.wireframeLinecap),t.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=t.wireframeLinejoin),t.rotation!==void 0&&(this.rotation=t.rotation),t.linewidth!==void 0&&(this.linewidth=t.linewidth),t.linecap!==void 0&&(this.linecap=t.linecap),t.linejoin!==void 0&&(this.linejoin=t.linejoin),t.dashSize!==void 0&&(this.dashSize=t.dashSize),t.gapSize!==void 0&&(this.gapSize=t.gapSize),t.scale!==void 0&&(this.scale=t.scale),t.polygonOffset!==void 0&&(this.polygonOffset=t.polygonOffset),t.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=t.polygonOffsetFactor),t.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=t.polygonOffsetUnits),t.dithering!==void 0&&(this.dithering=t.dithering),t.alphaToCoverage!==void 0&&(this.alphaToCoverage=t.alphaToCoverage),t.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=t.premultipliedAlpha),t.forceSinglePass!==void 0&&(this.forceSinglePass=t.forceSinglePass),t.allowOverride!==void 0&&(this.allowOverride=t.allowOverride),t.visible!==void 0&&(this.visible=t.visible),t.toneMapped!==void 0&&(this.toneMapped=t.toneMapped),t.userData!==void 0&&(this.userData=t.userData),t.vertexColors!==void 0&&(typeof t.vertexColors=="number"?this.vertexColors=t.vertexColors>0:this.vertexColors=t.vertexColors),t.size!==void 0&&(this.size=t.size),t.sizeAttenuation!==void 0&&(this.sizeAttenuation=t.sizeAttenuation),t.map!==void 0&&(this.map=e[t.map]||null),t.matcap!==void 0&&(this.matcap=e[t.matcap]||null),t.alphaMap!==void 0&&(this.alphaMap=e[t.alphaMap]||null),t.bumpMap!==void 0&&(this.bumpMap=e[t.bumpMap]||null),t.bumpScale!==void 0&&(this.bumpScale=t.bumpScale),t.normalMap!==void 0&&(this.normalMap=e[t.normalMap]||null),t.normalMapType!==void 0&&(this.normalMapType=t.normalMapType),t.normalScale!==void 0){let n=t.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new ot().fromArray(n)}return t.displacementMap!==void 0&&(this.displacementMap=e[t.displacementMap]||null),t.displacementScale!==void 0&&(this.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(this.displacementBias=t.displacementBias),t.roughnessMap!==void 0&&(this.roughnessMap=e[t.roughnessMap]||null),t.metalnessMap!==void 0&&(this.metalnessMap=e[t.metalnessMap]||null),t.emissiveMap!==void 0&&(this.emissiveMap=e[t.emissiveMap]||null),t.emissiveIntensity!==void 0&&(this.emissiveIntensity=t.emissiveIntensity),t.specularMap!==void 0&&(this.specularMap=e[t.specularMap]||null),t.specularIntensityMap!==void 0&&(this.specularIntensityMap=e[t.specularIntensityMap]||null),t.specularColorMap!==void 0&&(this.specularColorMap=e[t.specularColorMap]||null),t.envMap!==void 0&&(this.envMap=e[t.envMap]||null),t.envMapRotation!==void 0&&this.envMapRotation.fromArray(t.envMapRotation),t.envMapIntensity!==void 0&&(this.envMapIntensity=t.envMapIntensity),t.reflectivity!==void 0&&(this.reflectivity=t.reflectivity),t.refractionRatio!==void 0&&(this.refractionRatio=t.refractionRatio),t.lightMap!==void 0&&(this.lightMap=e[t.lightMap]||null),t.lightMapIntensity!==void 0&&(this.lightMapIntensity=t.lightMapIntensity),t.aoMap!==void 0&&(this.aoMap=e[t.aoMap]||null),t.aoMapIntensity!==void 0&&(this.aoMapIntensity=t.aoMapIntensity),t.gradientMap!==void 0&&(this.gradientMap=e[t.gradientMap]||null),t.clearcoatMap!==void 0&&(this.clearcoatMap=e[t.clearcoatMap]||null),t.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=e[t.clearcoatRoughnessMap]||null),t.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=e[t.clearcoatNormalMap]||null),t.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new ot().fromArray(t.clearcoatNormalScale)),t.diffuseRoughnessMap!==void 0&&(this.diffuseRoughnessMap=e[t.diffuseRoughnessMap]||null),t.iridescenceMap!==void 0&&(this.iridescenceMap=e[t.iridescenceMap]||null),t.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=e[t.iridescenceThicknessMap]||null),t.transmissionMap!==void 0&&(this.transmissionMap=e[t.transmissionMap]||null),t.thicknessMap!==void 0&&(this.thicknessMap=e[t.thicknessMap]||null),t.anisotropyMap!==void 0&&(this.anisotropyMap=e[t.anisotropyMap]||null),t.sheenColorMap!==void 0&&(this.sheenColorMap=e[t.sheenColorMap]||null),t.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=e[t.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const s=e.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=e[r].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.allowOverride=t.allowOverride,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}}class Qc extends bi{constructor(t){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new wt(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.rotation=t.rotation,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}let Oi;const ls=new R,zi=new R,Bi=new R,Gi=new ot,cs=new ot,jc=new he,Ys=new R,hs=new R,qs=new R,Cl=new ot,po=new ot,Pl=new ot;class sd extends De{constructor(t=new Qc){if(super(),this.isSprite=!0,this.type="Sprite",Oi===void 0){Oi=new Me;const e=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new td(e,5);Oi.setIndex([0,1,2,0,2,3]),Oi.setAttribute("position",new Cr(n,3,0,!1)),Oi.setAttribute("uv",new Cr(n,2,3,!1))}this.geometry=Oi,this.material=t,this.center=new ot(.5,.5),this.count=1}intersectsFrustum(t){return t.intersectsSprite(this)}raycast(t,e){t.camera===null&&Qt('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),zi.setFromMatrixScale(this.matrixWorld),jc.copy(t.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(t.camera.matrixWorldInverse,this.matrixWorld),Bi.setFromMatrixPosition(this.modelViewMatrix),t.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&zi.multiplyScalar(-Bi.z);const n=this.material.rotation;let s,r;n!==0&&(r=Math.cos(n),s=Math.sin(n));const o=this.center;Zs(Ys.set(-.5,-.5,0),Bi,o,zi,s,r),Zs(hs.set(.5,-.5,0),Bi,o,zi,s,r),Zs(qs.set(.5,.5,0),Bi,o,zi,s,r),Cl.set(0,0),po.set(1,0),Pl.set(1,1);let a=t.ray.intersectTriangle(Ys,hs,qs,!1,ls);if(a===null&&(Zs(hs.set(-.5,.5,0),Bi,o,zi,s,r),po.set(0,1),a=t.ray.intersectTriangle(Ys,qs,hs,!1,ls),a===null))return;const l=t.ray.origin.distanceTo(ls);l<t.near||l>t.far||e.push({distance:l,point:ls.clone(),uv:xn.getInterpolation(ls,Ys,hs,qs,Cl,po,Pl,new ot),face:null,object:this})}copy(t,e){return super.copy(t,e),t.center!==void 0&&this.center.copy(t.center),this.material=t.material,this}toJSON(t){const e=super.toJSON(t);return e.object.center=this.center.toArray(),e}}function Zs(i,t,e,n,s,r){Gi.subVectors(i,e).addScalar(.5).multiply(n),s!==void 0?(cs.x=r*Gi.x-s*Gi.y,cs.y=s*Gi.x+r*Gi.y):cs.copy(Gi),i.copy(t),i.x+=cs.x,i.y+=cs.y,i.applyMatrix4(jc)}const kn=new R,mo=new R,Ks=new R,Js=new R;class Ua{constructor(t=new R,e=new R(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,kn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=kn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(kn.copy(this.origin).addScaledVector(this.direction,e),kn.distanceToSquared(t))}distanceSqToSegment(t,e,n,s){mo.copy(t).add(e).multiplyScalar(.5),Ks.copy(e).sub(t).normalize(),Js.copy(this.origin).sub(mo);const r=t.distanceTo(e)*.5,o=-this.direction.dot(Ks),a=Js.dot(this.direction),l=-Js.dot(Ks),c=Js.lengthSq(),h=Math.abs(1-o*o);let u,d,f,_;if(h>0)if(u=o*l-a,d=o*a-l,_=r*h,u>=0)if(d>=-_)if(d<=_){const M=1/h;u*=M,d*=M,f=u*(u+o*d+2*a)+d*(o*u+d+2*l)+c}else d=r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d=-r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;else d<=-_?(u=Math.max(0,-(-o*r+a)),d=u>0?-r:Math.min(Math.max(-r,-l),r),f=-u*u+d*(d+2*l)+c):d<=_?(u=0,d=Math.min(Math.max(-r,-l),r),f=d*(d+2*l)+c):(u=Math.max(0,-(o*r+a)),d=u>0?r:Math.min(Math.max(-r,-l),r),f=-u*u+d*(d+2*l)+c);else d=o>0?-r:r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(mo).addScaledVector(Ks,d),f}intersectSphere(t,e){if(t.radius<0)return null;kn.subVectors(t.center,this.origin);const n=kn.dot(this.direction),s=kn.dot(kn)-n*n,r=t.radius*t.radius;if(s>r)return null;const o=Math.sqrt(r-s),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,s,r,o,a,l;const c=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(t.min.x-d.x)*c,s=(t.max.x-d.x)*c):(n=(t.max.x-d.x)*c,s=(t.min.x-d.x)*c),h>=0?(r=(t.min.y-d.y)*h,o=(t.max.y-d.y)*h):(r=(t.max.y-d.y)*h,o=(t.min.y-d.y)*h),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),u>=0?(a=(t.min.z-d.z)*u,l=(t.max.z-d.z)*u):(a=(t.max.z-d.z)*u,l=(t.min.z-d.z)*u),n>l||a>s)||((a>n||n!==n)&&(n=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,e)}intersectsBox(t){return this.intersectBox(t,kn)!==null}intersectTriangle(t,e,n,s,r){const o=this.origin,a=this.direction,l=a.x,c=a.y,h=a.z,u=t.x-o.x,d=t.y-o.y,f=t.z-o.z,_=e.x-o.x,M=e.y-o.y,p=e.z-o.z,m=n.x-o.x,x=n.y-o.y,y=n.z-o.z,v=Math.abs(l),T=Math.abs(c),b=Math.abs(h);let g,w,P,C,D,F,U,L,V,B,z,nt;if(v>=T&&v>=b?(P=l,F=u,V=_,nt=m,l>=0?(g=c,w=h,C=d,D=f,U=M,L=p,B=x,z=y):(g=h,w=c,C=f,D=d,U=p,L=M,B=y,z=x)):T>=b?(P=c,F=d,V=M,nt=x,c>=0?(g=h,w=l,C=f,D=u,U=p,L=_,B=y,z=m):(g=l,w=h,C=u,D=f,U=_,L=p,B=m,z=y)):(P=h,F=f,V=p,nt=y,h>=0?(g=l,w=c,C=u,D=d,U=_,L=M,B=m,z=x):(g=c,w=l,C=d,D=u,U=M,L=_,B=x,z=m)),P===0)return null;const H=g/P,Q=w/P,it=1/P,_t=C-H*F,bt=D-Q*F,K=U-H*V,lt=L-Q*V,St=B-H*nt,Tt=z-Q*nt,gt=St*lt-Tt*K,Ft=_t*Tt-bt*St,oe=K*bt-lt*_t;if(s){if(gt<0||Ft<0||oe<0)return null}else if((gt<0||Ft<0||oe<0)&&(gt>0||Ft>0||oe>0))return null;const Pt=gt+Ft+oe;if(Pt===0)return null;const zt=it*(gt*F+Ft*V+oe*nt);return(Pt>0?zt<0:zt>0)?null:this.at(zt/Pt,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Pr extends bi{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new wt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new hi,this.combine=Tc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const Ll=new he,_i=new Ua,$s=new zr,Dl=new R,Qs=new R,js=new R,tr=new R,go=new R,er=new R,Il=new R,nr=new R;class mt extends De{constructor(t=new Me,e=new Pr){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0?this.morphTargetInfluences=t.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,t.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){const n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;e.fromBufferAttribute(s,t);const a=this.morphTargetInfluences;if(r&&a){er.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const h=a[l],u=r[l];h!==0&&(go.fromBufferAttribute(u,t),o?er.addScaledVector(go,h):er.addScaledVector(go.sub(e),h))}e.add(er)}return e}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){const n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),$s.copy(n.boundingSphere),$s.applyMatrix4(r),_i.copy(t.ray).recast(t.near),!($s.containsPoint(_i.origin)===!1&&(_i.intersectSphere($s,Dl)===null||_i.origin.distanceToSquared(Dl)>(t.far-t.near)**2))&&(Ll.copy(r).invert(),_i.copy(t.ray).applyMatrix4(Ll),!(n.boundingBox!==null&&_i.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,_i)))}_computeIntersections(t,e,n){let s;const r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let _=0,M=d.length;_<M;_++){const p=d[_],m=o[p.materialIndex],x=Math.max(p.start,f.start),y=Math.min(a.count,Math.min(p.start+p.count,f.start+f.count));for(let v=x,T=y;v<T;v+=3){const b=a.getX(v),g=a.getX(v+1),w=a.getX(v+2);s=ir(this,m,t,n,c,h,u,b,g,w),s&&(s.faceIndex=Math.floor(v/3),s.face.materialIndex=p.materialIndex,e.push(s))}}else{const _=Math.max(0,f.start),M=Math.min(a.count,f.start+f.count);for(let p=_,m=M;p<m;p+=3){const x=a.getX(p),y=a.getX(p+1),v=a.getX(p+2);s=ir(this,o,t,n,c,h,u,x,y,v),s&&(s.faceIndex=Math.floor(p/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let _=0,M=d.length;_<M;_++){const p=d[_],m=o[p.materialIndex],x=Math.max(p.start,f.start),y=Math.min(l.count,Math.min(p.start+p.count,f.start+f.count));for(let v=x,T=y;v<T;v+=3){const b=v,g=v+1,w=v+2;s=ir(this,m,t,n,c,h,u,b,g,w),s&&(s.faceIndex=Math.floor(v/3),s.face.materialIndex=p.materialIndex,e.push(s))}}else{const _=Math.max(0,f.start),M=Math.min(l.count,f.start+f.count);for(let p=_,m=M;p<m;p+=3){const x=p,y=p+1,v=p+2;s=ir(this,o,t,n,c,h,u,x,y,v),s&&(s.faceIndex=Math.floor(p/3),e.push(s))}}}}function rd(i,t,e,n,s,r,o,a){let l;if(t.side===Je?l=n.intersectTriangle(o,r,s,!0,a):l=n.intersectTriangle(s,r,o,t.side===yi,a),l===null)return null;nr.copy(a),nr.applyMatrix4(i.matrixWorld);const c=e.ray.origin.distanceTo(nr);return c<e.near||c>e.far?null:{distance:c,point:nr.clone(),object:i}}function ir(i,t,e,n,s,r,o,a,l,c){i.getVertexPosition(a,Qs),i.getVertexPosition(l,js),i.getVertexPosition(c,tr);const h=rd(i,t,e,n,Qs,js,tr,Il);if(h){const u=new R;xn.getBarycoord(Il,Qs,js,tr,u),s&&(h.uv=xn.getInterpolatedAttribute(s,a,l,c,u,new ot)),r&&(h.uv1=xn.getInterpolatedAttribute(r,a,l,c,u,new ot)),o&&(h.normal=xn.getInterpolatedAttribute(o,a,l,c,u,new R),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const d={a,b:l,c,normal:new R,materialIndex:0};xn.getNormal(Qs,js,tr,d.normal),h.face=d,h.barycoord=u}return h}class od extends $e{constructor(t=null,e=1,n=1,s,r,o,a,l,c=Ve,h=Ve,u,d){super(null,o,a,l,c,h,s,r,u,d),this.isDataTexture=!0,this.image={data:t,width:e,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const xi=new zr,ad=new ot(.5,.5),sr=new R;class Rs{constructor(t=new Hn,e=new Hn,n=new Hn,s=new Hn,r=new Hn,o=new Hn){this.planes=[t,e,n,s,r,o]}set(t,e,n,s,r,o){const a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=En,n=!1){const s=this.planes,r=t.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],u=r[5],d=r[6],f=r[7],_=r[8],M=r[9],p=r[10],m=r[11],x=r[12],y=r[13],v=r[14],T=r[15];if(s[0].setComponents(c-o,f-h,m-_,T-x).normalize(),s[1].setComponents(c+o,f+h,m+_,T+x).normalize(),s[2].setComponents(c+a,f+u,m+M,T+y).normalize(),s[3].setComponents(c-a,f-u,m-M,T-y).normalize(),n)s[4].setComponents(l,d,p,v).normalize(),s[5].setComponents(c-l,f-d,m-p,T-v).normalize();else if(s[4].setComponents(c-l,f-d,m-p,T-v).normalize(),e===En)s[5].setComponents(c+l,f+d,m+p,T+v).normalize();else if(e===Ts)s[5].setComponents(l,d,p,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),xi.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),xi.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(xi)}intersectsSprite(t){xi.center.set(0,0,0);const e=ad.distanceTo(t.center);return xi.radius=.7071067811865476+e,xi.applyMatrix4(t.matrixWorld),this.intersectsSphere(xi)}intersectsSphere(t){const e=this.planes,n=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const s=e[n];if(sr.x=s.normal.x>0?t.max.x:t.min.x,sr.y=s.normal.y>0?t.max.y:t.min.y,sr.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(sr)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}const Nl=new he;class Fa{constructor(){this.coordinateSystem=En,this._frustums=[],this._count=0}setFromArrayCamera(t){const e=t.cameras,n=this._frustums;for(let s=0;s<e.length;s++){const r=e[s];Nl.multiplyMatrices(r.projectionMatrix,r.matrixWorldInverse),n[s]===void 0&&(n[s]=new Rs),n[s].setFromProjectionMatrix(Nl,r.coordinateSystem,r.reversedDepth)}return this._count=e.length,this}getFrustum(t){return this._frustums[t]}intersectsObject(t){const e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsObject(t))return!0;return!1}intersectsSprite(t){const e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsSprite(t))return!0;return!1}intersectsSphere(t){const e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsSphere(t))return!0;return!1}intersectsBox(t){const e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].intersectsBox(t))return!0;return!1}containsPoint(t){const e=this._frustums;for(let n=0;n<this._count;n++)if(e[n].containsPoint(t))return!0;return!1}copy(t){this.coordinateSystem=t.coordinateSystem;const e=this._frustums,n=t._frustums;for(let s=0;s<t._count;s++)e[s]===void 0&&(e[s]=new Rs),e[s].copy(n[s]);return this._count=t._count,this}clone(){return new Fa().copy(this)}}class th extends bi{constructor(t){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new wt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}const Ul=new he,ua=new Ua,rr=new zr,or=new R;class Fl extends De{constructor(t=new Me,e=new th){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0?this.morphTargetInfluences=t.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,t.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}intersectsFrustum(t){return t.intersectsObject(this)}raycast(t,e){const n=this.geometry,s=this.matrixWorld,r=t.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),rr.copy(n.boundingSphere),rr.applyMatrix4(s),rr.radius+=r,t.ray.intersectsSphere(rr)===!1)return;Ul.copy(s).invert(),ua.copy(t.ray).applyMatrix4(Ul);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=n.index,u=n.attributes.position;if(c!==null){const d=Math.max(0,o.start),f=Math.min(c.count,o.start+o.count);for(let _=d,M=f;_<M;_++){const p=c.getX(_);or.fromBufferAttribute(u,p),Ol(or,p,l,s,t,e,this)}}else{const d=Math.max(0,o.start),f=Math.min(u.count,o.start+o.count);for(let _=d,M=f;_<M;_++)or.fromBufferAttribute(u,_),Ol(or,_,l,s,t,e,this)}}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const s=e[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function Ol(i,t,e,n,s,r,o){const a=ua.distanceSqToPoint(i);if(a<e){const l=new R;ua.closestPointToPoint(i,l),l.applyMatrix4(n);const c=s.ray.origin.distanceTo(l);if(c<s.near||c>s.far)return;r.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}class eh extends $e{constructor(t=[],e=Ji,n,s,r,o,a,l,c,h){super(t,e,n,s,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class Br extends $e{constructor(t,e,n,s,r,o,a,l,c){super(t,e,n,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Qi extends $e{constructor(t,e,n=Dn,s,r,o,a=Ve,l=Ve,c,h=li,u=1){if(h!==li&&h!==oi)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:t,height:e,depth:u};super(d,s,r,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Ia(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return e.compareFunction=this.compareFunction,e}}class nh extends Qi{constructor(t,e=Dn,n=Ji,s,r,o=Ve,a=Ve,l,c=li){const h={width:t,height:t,depth:1},u=[h,h,h,h,h,h];super(t,t,e,n,s,r,o,a,l,c),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(t){this.image=t}}class ih extends $e{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}}class ln extends Me{constructor(t=1,e=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};const a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);const l=[],c=[],h=[],u=[];let d=0,f=0;_("z","y","x",-1,-1,n,e,t,o,r,0),_("z","y","x",1,-1,n,e,-t,o,r,1),_("x","z","y",1,1,t,n,e,s,o,2),_("x","z","y",1,-1,t,n,-e,s,o,3),_("x","y","z",1,-1,t,e,n,s,r,4),_("x","y","z",-1,-1,t,e,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new Ht(c,3)),this.setAttribute("normal",new Ht(h,3)),this.setAttribute("uv",new Ht(u,2));function _(M,p,m,x,y,v,T,b,g,w,P){const C=v/g,D=T/w,F=v/2,U=T/2,L=b/2,V=g+1,B=w+1;let z=0,nt=0;const H=new R;for(let Q=0;Q<B;Q++){const it=Q*D-U;for(let _t=0;_t<V;_t++){const bt=_t*C-F;H[M]=bt*x,H[p]=it*y,H[m]=L,c.push(H.x,H.y,H.z),H[M]=0,H[p]=0,H[m]=b>0?1:-1,h.push(H.x,H.y,H.z),u.push(_t/g),u.push(1-Q/w),z+=1}}for(let Q=0;Q<w;Q++)for(let it=0;it<g;it++){const _t=d+it+V*Q,bt=d+it+V*(Q+1),K=d+(it+1)+V*(Q+1),lt=d+(it+1)+V*Q;l.push(_t,bt,lt),l.push(bt,K,lt),nt+=6}a.addGroup(f,nt,P),f+=nt,d+=z}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ln(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}class Oa extends Me{constructor(t=1,e=1,n=4,s=8,r=1){super(),this.type="CapsuleGeometry",this.parameters={radius:t,height:e,capSegments:n,radialSegments:s,heightSegments:r},e=Math.max(0,e),n=Math.max(1,Math.floor(n)),s=Math.max(3,Math.floor(s)),r=Math.max(1,Math.floor(r));const o=[],a=[],l=[],c=[],h=e/2,u=Math.PI/2*t,d=e,f=2*u+d,_=n*2+r,M=s+1,p=new R,m=new R;for(let x=0;x<=_;x++){let y=0,v=0,T=0,b=0;if(x<=n){const P=x/n,C=P*Math.PI/2;v=-h-t*Math.cos(C),T=t*Math.sin(C),b=-t*Math.cos(C),y=P*u}else if(x<=n+r){const P=(x-n)/r;v=-h+P*e,T=t,b=0,y=u+P*d}else{const P=(x-n-r)/n,C=P*Math.PI/2;v=h+t*Math.sin(C),T=t*Math.cos(C),b=t*Math.sin(C),y=u+d+P*u}const g=Math.max(0,Math.min(1,y/f));let w=0;x===0?w=.5/s:x===_&&(w=-.5/s);for(let P=0;P<=s;P++){const C=P/s,D=C*Math.PI*2,F=Math.sin(D),U=Math.cos(D);m.x=-T*U,m.y=v,m.z=T*F,a.push(m.x,m.y,m.z),p.set(-T*U,b,T*F),p.normalize(),l.push(p.x,p.y,p.z),c.push(C+w,g)}if(x>0){const P=(x-1)*M;for(let C=0;C<s;C++){const D=P+C,F=P+C+1,U=x*M+C,L=x*M+C+1;o.push(D,F,U),o.push(F,L,U)}}}this.setIndex(o),this.setAttribute("position",new Ht(a,3)),this.setAttribute("normal",new Ht(l,3)),this.setAttribute("uv",new Ht(c,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Oa(t.radius,t.height,t.capSegments,t.radialSegments,t.heightSegments)}}class za extends Me{constructor(t=1,e=32,n=0,s=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:s},e=Math.max(3,e);const r=[],o=[],a=[],l=[],c=new R,h=new ot;o.push(0,0,0),a.push(0,0,1),l.push(.5,.5);for(let u=0,d=3;u<=e;u++,d+=3){const f=n+u/e*s;c.x=t*Math.cos(f),c.y=t*Math.sin(f),o.push(c.x,c.y,c.z),a.push(0,0,1),h.x=(o[d]/t+1)/2,h.y=(o[d+1]/t+1)/2,l.push(h.x,h.y)}for(let u=1;u<=e;u++)r.push(u,u+1,0);this.setIndex(r),this.setAttribute("position",new Ht(o,3)),this.setAttribute("normal",new Ht(a,3)),this.setAttribute("uv",new Ht(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new za(t.radius,t.segments,t.thetaStart,t.thetaLength)}}class Ze extends Me{constructor(t=1,e=1,n=1,s=32,r=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:l};const c=this;s=Math.floor(s),r=Math.floor(r);const h=[],u=[],d=[],f=[];let _=0;const M=[],p=n/2;let m=0;x(),o===!1&&(t>0&&y(!0),e>0&&y(!1)),this.setIndex(h),this.setAttribute("position",new Ht(u,3)),this.setAttribute("normal",new Ht(d,3)),this.setAttribute("uv",new Ht(f,2));function x(){const v=new R,T=new R;let b=0;const g=(e-t)/n;for(let w=0;w<=r;w++){const P=[],C=w/r,D=C*(e-t)+t;for(let F=0;F<=s;F++){const U=F/s,L=U*l+a,V=Math.sin(L),B=Math.cos(L);T.x=D*V,T.y=-C*n+p,T.z=D*B,u.push(T.x,T.y,T.z),v.set(V,g,B).normalize(),d.push(v.x,v.y,v.z),f.push(U,1-C),P.push(_++)}M.push(P)}for(let w=0;w<s;w++)for(let P=0;P<r;P++){const C=M[P][w],D=M[P+1][w],F=M[P+1][w+1],U=M[P][w+1];(t>0||P!==0)&&(h.push(C,D,U),b+=3),(e>0||P!==r-1)&&(h.push(D,F,U),b+=3)}c.addGroup(m,b,0),m+=b}function y(v){const T=_,b=new ot,g=new R;let w=0;const P=v===!0?t:e,C=v===!0?1:-1;for(let F=1;F<=s;F++)u.push(0,p*C,0),d.push(0,C,0),f.push(.5,.5),_++;const D=_;for(let F=0;F<=s;F++){const L=F/s*l+a,V=Math.cos(L),B=Math.sin(L);g.x=P*B,g.y=p*C,g.z=P*V,u.push(g.x,g.y,g.z),d.push(0,C,0),b.x=V*.5+.5,b.y=B*.5*C+.5,f.push(b.x,b.y),_++}for(let F=0;F<s;F++){const U=T+F,L=D+F;v===!0?h.push(L,L+1,U):h.push(L+1,L,U),w+=3}c.addGroup(m,w,v===!0?1:2),m+=w}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ze(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class vi extends Ze{constructor(t=1,e=1,n=32,s=1,r=!1,o=0,a=Math.PI*2){super(0,t,e,n,s,r,o,a),this.type="ConeGeometry",this.parameters={radius:t,height:e,radialSegments:n,heightSegments:s,openEnded:r,thetaStart:o,thetaLength:a}}static fromJSON(t){return new vi(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class Ba extends Me{constructor(t=[],e=[],n=1,s=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:s};const r=[],o=[];a(s),c(n),h(),this.setAttribute("position",new Ht(r,3)),this.setAttribute("normal",new Ht(r.slice(),3)),this.setAttribute("uv",new Ht(o,2)),s===0?this.computeVertexNormals():this.normalizeNormals();function a(x){const y=new R,v=new R,T=new R;for(let b=0;b<e.length;b+=3)f(e[b+0],y),f(e[b+1],v),f(e[b+2],T),l(y,v,T,x)}function l(x,y,v,T){const b=T+1,g=[];for(let w=0;w<=b;w++){g[w]=[];const P=x.clone().lerp(v,w/b),C=y.clone().lerp(v,w/b),D=b-w;for(let F=0;F<=D;F++)F===0&&w===b?g[w][F]=P:g[w][F]=P.clone().lerp(C,F/D)}for(let w=0;w<b;w++)for(let P=0;P<2*(b-w)-1;P++){const C=Math.floor(P/2);P%2===0?(d(g[w][C+1]),d(g[w+1][C]),d(g[w][C])):(d(g[w][C+1]),d(g[w+1][C+1]),d(g[w+1][C]))}}function c(x){const y=new R;for(let v=0;v<r.length;v+=3)y.x=r[v+0],y.y=r[v+1],y.z=r[v+2],y.normalize().multiplyScalar(x),r[v+0]=y.x,r[v+1]=y.y,r[v+2]=y.z}function h(){const x=new R;for(let y=0;y<r.length;y+=3){x.x=r[y+0],x.y=r[y+1],x.z=r[y+2];const v=p(x)/2/Math.PI+.5,T=m(x)/Math.PI+.5;o.push(v,1-T)}_(),u()}function u(){for(let x=0;x<o.length;x+=6){const y=o[x+0],v=o[x+2],T=o[x+4],b=Math.max(y,v,T),g=Math.min(y,v,T);b>.9&&g<.1&&(y<.2&&(o[x+0]+=1),v<.2&&(o[x+2]+=1),T<.2&&(o[x+4]+=1))}}function d(x){r.push(x.x,x.y,x.z)}function f(x,y){const v=x*3;y.x=t[v+0],y.y=t[v+1],y.z=t[v+2]}function _(){const x=new R,y=new R,v=new R,T=new R,b=new ot,g=new ot,w=new ot;for(let P=0,C=0;P<r.length;P+=9,C+=6){x.set(r[P+0],r[P+1],r[P+2]),y.set(r[P+3],r[P+4],r[P+5]),v.set(r[P+6],r[P+7],r[P+8]),b.set(o[C+0],o[C+1]),g.set(o[C+2],o[C+3]),w.set(o[C+4],o[C+5]),T.copy(x).add(y).add(v).divideScalar(3);const D=p(T);M(b,C+0,x,D),M(g,C+2,y,D),M(w,C+4,v,D)}}function M(x,y,v,T){T<0&&x.x===1&&(o[y]=x.x-1),v.x===0&&v.z===0&&(o[y]=T/2/Math.PI+.5)}function p(x){return Math.atan2(x.z,-x.x)}function m(x){return Math.atan2(-x.y,Math.sqrt(x.x*x.x+x.z*x.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Ba(t.vertices,t.indices,t.radius,t.detail)}}class Ga extends Ba{constructor(t=1,e=0){const n=(1+Math.sqrt(5))/2,s=1/n,r=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-s,-n,0,-s,n,0,s,-n,0,s,n,-s,-n,0,-s,n,0,s,-n,0,s,n,0,-n,0,-s,n,0,-s,-n,0,s,n,0,s],o=[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9];super(r,o,t,e),this.type="DodecahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new Ga(t.radius,t.detail)}}class Nn{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Ot("Curve: .getPoint() not implemented.")}getPointAt(t,e){const n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const e=[];let n,s=this.getPoint(0),r=0;e.push(0);for(let o=1;o<=t;o++)n=this.getPoint(o/t),r+=n.distanceTo(s),e.push(r),s=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e=null){const n=this.getLengths();let s=0;const r=n.length;let o;e?o=e:o=t*n[r-1];let a=0,l=r-1,c;for(;a<=l;)if(s=Math.floor(a+(l-a)/2),c=n[s]-o,c<0)a=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,n[s]===o)return s/(r-1);const h=n[s],d=n[s+1]-h,f=(o-h)/d;return(s+f)/(r-1)}getTangent(t,e){let s=t-1e-4,r=t+1e-4;s<0&&(s=0),r>1&&(r=1);const o=this.getPoint(s),a=this.getPoint(r),l=e||(o.isVector2?new ot:new R);return l.copy(a).sub(o).normalize(),l}getTangentAt(t,e){const n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e=!1){const n=new R,s=[],r=[],o=[],a=new R,l=new he;for(let f=0;f<=t;f++){const _=f/t;s[f]=this.getTangentAt(_,new R)}r[0]=new R,o[0]=new R;let c=Number.MAX_VALUE;const h=Math.abs(s[0].x),u=Math.abs(s[0].y),d=Math.abs(s[0].z);h<=c&&(c=h,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),a.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],a),o[0].crossVectors(s[0],r[0]);for(let f=1;f<=t;f++){if(r[f]=r[f-1].clone(),o[f]=o[f-1].clone(),a.crossVectors(s[f-1],s[f]),a.length()>Number.EPSILON){a.normalize();const _=Math.acos(Vt(s[f-1].dot(s[f]),-1,1));r[f].applyMatrix4(l.makeRotationAxis(a,_))}o[f].crossVectors(s[f],r[f])}if(e===!0){let f=Math.acos(Vt(r[0].dot(r[t]),-1,1));f/=t,s[0].dot(a.crossVectors(r[0],r[t]))>0&&(f=-f);for(let _=1;_<=t;_++)r[_].applyMatrix4(l.makeRotationAxis(s[_],f*_)),o[_].crossVectors(s[_],r[_])}return{tangents:s,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this.cacheArcLengths=null,this}toJSON(){const t={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this.cacheArcLengths=null,this}}class ka extends Nn{constructor(t=0,e=0,n=1,s=1,r=0,o=Math.PI*2,a=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=l}getPoint(t,e=new ot){const n=e,s=Math.PI*2;let r=this.aEndAngle-this.aStartAngle;const o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(o?r=0:r=s),this.aClockwise===!0&&!o&&(r===s?r=-s:r=r-s);const a=this.aStartAngle+t*r;let l=this.aX+this.xRadius*Math.cos(a),c=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),d=l-this.aX,f=c-this.aY;l=d*h-f*u+this.aX,c=d*u+f*h+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class ld extends ka{constructor(t,e,n,s,r,o){super(t,e,n,n,s,r,o),this.isArcCurve=!0,this.type="ArcCurve"}}function Ha(){let i=0,t=0,e=0,n=0;function s(r,o,a,l){i=r,t=a,e=-3*r+3*o-2*a-l,n=2*r-2*o+a+l}return{initCatmullRom:function(r,o,a,l,c){s(o,a,c*(a-r),c*(l-o))},initNonuniformCatmullRom:function(r,o,a,l,c,h,u){let d=(o-r)/c-(a-r)/(c+h)+(a-o)/h,f=(a-o)/h-(l-o)/(h+u)+(l-a)/u;d*=h,f*=h,s(o,a,d,f)},calc:function(r){const o=r*r,a=o*r;return i+t*r+e*o+n*a}}}const zl=new R,Bl=new R,_o=new Ha,xo=new Ha,vo=new Ha;class nn extends Nn{constructor(t=[],e=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=s}getPoint(t,e=new R){const n=e,s=this.points,r=s.length,o=(r-(this.closed?0:1))*t;let a=Math.floor(o),l=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:l===0&&a===r-1&&(a=r-2,l=1);let c,h;this.closed||a>0?c=s[(a-1)%r]:(Bl.subVectors(s[0],s[1]).add(s[0]),c=Bl);const u=s[a%r],d=s[(a+1)%r];if(this.closed||a+2<r?h=s[(a+2)%r]:(zl.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=zl),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let _=Math.pow(c.distanceToSquared(u),f),M=Math.pow(u.distanceToSquared(d),f),p=Math.pow(d.distanceToSquared(h),f);M<1e-4&&(M=1),_<1e-4&&(_=M),p<1e-4&&(p=M),_o.initNonuniformCatmullRom(c.x,u.x,d.x,h.x,_,M,p),xo.initNonuniformCatmullRom(c.y,u.y,d.y,h.y,_,M,p),vo.initNonuniformCatmullRom(c.z,u.z,d.z,h.z,_,M,p)}else this.curveType==="catmullrom"&&(_o.initCatmullRom(c.x,u.x,d.x,h.x,this.tension),xo.initCatmullRom(c.y,u.y,d.y,h.y,this.tension),vo.initCatmullRom(c.z,u.z,d.z,h.z,this.tension));return n.set(_o.calc(l),xo.calc(l),vo.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(s.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const s=this.points[e];t.points.push(s.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(new R().fromArray(s))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function Gl(i,t,e,n,s){const r=(n-t)*.5,o=(s-e)*.5,a=i*i,l=i*a;return(2*e-2*n+r+o)*l+(-3*e+3*n-2*r-o)*a+r*i+e}function cd(i,t){const e=1-i;return e*e*t}function hd(i,t){return 2*(1-i)*i*t}function ud(i,t){return i*i*t}function vs(i,t,e,n){return cd(i,t)+hd(i,e)+ud(i,n)}function dd(i,t){const e=1-i;return e*e*e*t}function fd(i,t){const e=1-i;return 3*e*e*i*t}function pd(i,t){return 3*(1-i)*i*i*t}function md(i,t){return i*i*i*t}function Ms(i,t,e,n,s){return dd(i,t)+fd(i,e)+pd(i,n)+md(i,s)}class sh extends Nn{constructor(t=new ot,e=new ot,n=new ot,s=new ot){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new ot){const n=e,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Ms(t,s.x,r.x,o.x,a.x),Ms(t,s.y,r.y,o.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class gd extends Nn{constructor(t=new R,e=new R,n=new R,s=new R){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=s}getPoint(t,e=new R){const n=e,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Ms(t,s.x,r.x,o.x,a.x),Ms(t,s.y,r.y,o.y,a.y),Ms(t,s.z,r.z,o.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class rh extends Nn{constructor(t=new ot,e=new ot){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new ot){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new ot){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class _d extends Nn{constructor(t=new R,e=new R){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new R){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new R){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class oh extends Nn{constructor(t=new ot,e=new ot,n=new ot){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new ot){const n=e,s=this.v0,r=this.v1,o=this.v2;return n.set(vs(t,s.x,r.x,o.x),vs(t,s.y,r.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class ah extends Nn{constructor(t=new R,e=new R,n=new R){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new R){const n=e,s=this.v0,r=this.v1,o=this.v2;return n.set(vs(t,s.x,r.x,o.x),vs(t,s.y,r.y,o.y),vs(t,s.z,r.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class lh extends Nn{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new ot){const n=e,s=this.points,r=(s.length-1)*t,o=Math.floor(r),a=r-o,l=s[o===0?o:o-1],c=s[o],h=s[o>s.length-2?s.length-1:o+1],u=s[o>s.length-3?s.length-1:o+2];return n.set(Gl(a,l.x,c.x,h.x,u.x),Gl(a,l.y,c.y,h.y,u.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(s.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const s=this.points[e];t.points.push(s.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const s=t.points[e];this.points.push(new ot().fromArray(s))}return this}}var da=Object.freeze({__proto__:null,ArcCurve:ld,CatmullRomCurve3:nn,CubicBezierCurve:sh,CubicBezierCurve3:gd,EllipseCurve:ka,LineCurve:rh,LineCurve3:_d,QuadraticBezierCurve:oh,QuadraticBezierCurve3:ah,SplineCurve:lh});class xd extends Nn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1,this.cacheLengths=null}add(t){this.curves.push(t)}closePath(){const t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){const n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new da[n](e,t))}return this}getPoint(t,e){const n=t*this.getLength(),s=this.getCurveLengths();let r=0;for(;r<s.length;){if(s[r]>=n){const o=s[r]-n,a=this.curves[r],l=a.getLength(),c=l===0?0:1-o/l;return a.getPointAt(c,e)}r++}return null}getLength(){const t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const t=[];let e=0;for(let n=0,s=this.curves.length;n<s;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){const e=[];let n;for(let s=0,r=this.curves;s<r.length;s++){const o=r[s],a=o.isEllipseCurve?t*2:o.isLineCurve||o.isLineCurve3?1:o.isSplineCurve?t*o.points.length:t,l=o.getPoints(a);for(let c=0;c<l.length;c++){const h=l[c];n&&n.equals(h)||(e.push(h),n=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const s=t.curves[e];this.curves.push(s.clone())}return this.autoClose=t.autoClose,this.cacheLengths=null,this}toJSON(){const t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){const s=this.curves[e];t.curves.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const s=t.curves[e];this.curves.push(new da[s.type]().fromJSON(s))}return this.cacheLengths=null,this}}class kl extends xd{constructor(t){super(),this.type="Path",this.currentPoint=new ot,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){const n=new rh(this.currentPoint.clone(),new ot(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,s){const r=new oh(this.currentPoint.clone(),new ot(t,e),new ot(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(t,e,n,s,r,o){const a=new sh(this.currentPoint.clone(),new ot(t,e),new ot(n,s),new ot(r,o));return this.curves.push(a),this.currentPoint.set(r,o),this}splineThru(t){const e=[this.currentPoint.clone()].concat(t),n=new lh(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,s,r,o){const a=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+a,e+l,n,s,r,o),this}absarc(t,e,n,s,r,o){return this.absellipse(t,e,n,n,s,r,o),this}ellipse(t,e,n,s,r,o,a,l){const c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+c,e+h,n,s,r,o,a,l),this}absellipse(t,e,n,s,r,o,a,l){const c=new ka(t,e,n,s,r,o,a,l);if(this.curves.length>0){const u=c.getPoint(0);u.equals(this.currentPoint)||this.lineTo(u.x,u.y)}this.curves.push(c);const h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){const t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}}class Va extends kl{constructor(t){super(t),this.uuid=Kn(),this.type="Shape",this.holes=[]}getPointsHoles(t){const e=[];for(let n=0,s=this.holes.length;n<s;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){const s=t.holes[e];this.holes.push(s.clone())}return this}toJSON(){const t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){const s=this.holes[e];t.holes.push(s.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){const s=t.holes[e];this.holes.push(new kl().fromJSON(s))}return this}}function vd(i,t,e=2){const n=t&&t.length,s=n?t[0]*e:i.length;let r=ch(i,0,s,e,!0);const o=[];if(!r||r.next===r.prev)return o;let a,l,c;if(n&&(r=Ed(i,t,r,e)),i.length>80*e){a=i[0],l=i[1];let h=a,u=l;for(let d=e;d<s;d+=e){const f=i[d],_=i[d+1];f<a&&(a=f),_<l&&(l=_),f>h&&(h=f),_>u&&(u=_)}c=Math.max(h-a,u-l),c=c!==0?32767/c:0}return Cs(r,o,e,a,l,c,0),o}function ch(i,t,e,n,s){let r;if(s===Ud(i,t,e,n)>0)for(let o=t;o<e;o+=n)r=Hl(o/n|0,i[o],i[o+1],r);else for(let o=e-n;o>=t;o-=n)r=Hl(o/n|0,i[o],i[o+1],r);return r&&ji(r,r.next)&&(Ls(r),r=r.next),r}function Ei(i,t){if(!i)return i;t||(t=i);let e=i,n;do if(n=!1,!e.steiner&&(ji(e,e.next)||ve(e.prev,e,e.next)===0)){if(Ls(e),e=t=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==t);return t}function Cs(i,t,e,n,s,r,o){if(!i)return;!o&&r&&Cd(i,n,s,r);let a=i;for(;i.prev!==i.next;){const l=i.prev,c=i.next;if(r?Sd(i,n,s,r):Md(i)){t.push(l.i,i.i,c.i),Ls(i),i=c.next,a=c.next;continue}if(i=c,i===a){o?o===1?(i=yd(Ei(i),t),Cs(i,t,e,n,s,r,2)):o===2&&wd(i,t,e,n,s,r):Cs(Ei(i),t,e,n,s,r,1);break}}}function Md(i){const t=i.prev,e=i,n=i.next;if(ve(t,e,n)>=0)return!1;const s=t.x,r=e.x,o=n.x,a=t.y,l=e.y,c=n.y,h=Math.min(s,r,o),u=Math.min(a,l,c),d=Math.max(s,r,o),f=Math.max(a,l,c);let _=n.next;for(;_!==t;){if(_.x>=h&&_.x<=d&&_.y>=u&&_.y<=f&&fs(s,a,r,l,o,c,_.x,_.y)&&ve(_.prev,_,_.next)>=0)return!1;_=_.next}return!0}function Sd(i,t,e,n){const s=i.prev,r=i,o=i.next;if(ve(s,r,o)>=0)return!1;const a=s.x,l=r.x,c=o.x,h=s.y,u=r.y,d=o.y,f=Math.min(a,l,c),_=Math.min(h,u,d),M=Math.max(a,l,c),p=Math.max(h,u,d),m=fa(f,_,t,e,n),x=fa(M,p,t,e,n);let y=i.prevZ,v=i.nextZ;for(;y&&y.z>=m&&v&&v.z<=x;){if(y.x>=f&&y.x<=M&&y.y>=_&&y.y<=p&&y!==s&&y!==o&&fs(a,h,l,u,c,d,y.x,y.y)&&ve(y.prev,y,y.next)>=0||(y=y.prevZ,v.x>=f&&v.x<=M&&v.y>=_&&v.y<=p&&v!==s&&v!==o&&fs(a,h,l,u,c,d,v.x,v.y)&&ve(v.prev,v,v.next)>=0))return!1;v=v.nextZ}for(;y&&y.z>=m;){if(y.x>=f&&y.x<=M&&y.y>=_&&y.y<=p&&y!==s&&y!==o&&fs(a,h,l,u,c,d,y.x,y.y)&&ve(y.prev,y,y.next)>=0)return!1;y=y.prevZ}for(;v&&v.z<=x;){if(v.x>=f&&v.x<=M&&v.y>=_&&v.y<=p&&v!==s&&v!==o&&fs(a,h,l,u,c,d,v.x,v.y)&&ve(v.prev,v,v.next)>=0)return!1;v=v.nextZ}return!0}function yd(i,t){let e=i;do{const n=e.prev,s=e.next.next;!ji(n,s)&&uh(n,e,e.next,s)&&Ps(n,s)&&Ps(s,n)&&(t.push(n.i,e.i,s.i),Ls(e),Ls(e.next),e=i=s),e=e.next}while(e!==i);return Ei(e)}function wd(i,t,e,n,s,r){let o=i;do{let a=o.next.next;for(;a!==o.prev;){if(o.i!==a.i&&Dd(o,a)){let l=dh(o,a);o=Ei(o,o.next),l=Ei(l,l.next),Cs(o,t,e,n,s,r,0),Cs(l,t,e,n,s,r,0);return}a=a.next}o=o.next}while(o!==i)}function Ed(i,t,e,n){const s=[];for(let r=0,o=t.length;r<o;r++){const a=t[r]*n,l=r<o-1?t[r+1]*n:i.length,c=ch(i,a,l,n,!1);c===c.next&&(c.steiner=!0),s.push(Ld(c))}s.sort(bd);for(let r=0;r<s.length;r++)e=Td(s[r],e);return e}function bd(i,t){let e=i.x-t.x;if(e===0&&(e=i.y-t.y,e===0)){const n=(i.next.y-i.y)/(i.next.x-i.x),s=(t.next.y-t.y)/(t.next.x-t.x);e=n-s}return e}function Td(i,t){const e=Ad(i,t);if(!e)return t;const n=dh(e,i);return Ei(n,n.next),Ei(e,e.next)}function Ad(i,t){let e=t;const n=i.x,s=i.y;let r=-1/0,o;if(ji(i,e))return e;do{if(ji(i,e.next))return e.next;if(s<=e.y&&s>=e.next.y&&e.next.y!==e.y){const u=e.x+(s-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(u<=n&&u>r&&(r=u,o=e.x<e.next.x?e:e.next,u===n))return o}e=e.next}while(e!==t);if(!o)return null;const a=o,l=o.x,c=o.y;let h=1/0;e=o;do{if(n>=e.x&&e.x>=l&&n!==e.x&&hh(s<c?n:r,s,l,c,s<c?r:n,s,e.x,e.y)){const u=Math.abs(s-e.y)/(n-e.x);Ps(e,i)&&(u<h||u===h&&(e.x>o.x||e.x===o.x&&Rd(o,e)))&&(o=e,h=u)}e=e.next}while(e!==a);return o}function Rd(i,t){return ve(i.prev,i,t.prev)<0&&ve(t.next,i,i.next)<0}function Cd(i,t,e,n){let s=i;do s.z===0&&(s.z=fa(s.x,s.y,t,e,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,Pd(s)}function Pd(i){let t,e=1;do{let n=i,s;i=null;let r=null;for(t=0;n;){t++;let o=n,a=0;for(let c=0;c<e&&(a++,o=o.nextZ,!!o);c++);let l=e;for(;a>0||l>0&&o;)a!==0&&(l===0||!o||n.z<=o.z)?(s=n,n=n.nextZ,a--):(s=o,o=o.nextZ,l--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=o}r.nextZ=null,e*=2}while(t>1);return i}function fa(i,t,e,n,s){return i=(i-e)*s|0,t=(t-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,i|t<<1}function Ld(i){let t=i,e=i;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==i);return e}function hh(i,t,e,n,s,r,o,a){return(s-o)*(t-a)>=(i-o)*(r-a)&&(i-o)*(n-a)>=(e-o)*(t-a)&&(e-o)*(r-a)>=(s-o)*(n-a)}function fs(i,t,e,n,s,r,o,a){return!(i===o&&t===a)&&hh(i,t,e,n,s,r,o,a)}function Dd(i,t){return i.next.i!==t.i&&i.prev.i!==t.i&&!Id(i,t)&&(Ps(i,t)&&Ps(t,i)&&Nd(i,t)&&(ve(i.prev,i,t.prev)||ve(i,t.prev,t))||ji(i,t)&&ve(i.prev,i,i.next)>0&&ve(t.prev,t,t.next)>0)}function ve(i,t,e){return(t.y-i.y)*(e.x-t.x)-(t.x-i.x)*(e.y-t.y)}function ji(i,t){return i.x===t.x&&i.y===t.y}function uh(i,t,e,n){const s=lr(ve(i,t,e)),r=lr(ve(i,t,n)),o=lr(ve(e,n,i)),a=lr(ve(e,n,t));return!!(s!==r&&o!==a||s===0&&ar(i,e,t)||r===0&&ar(i,n,t)||o===0&&ar(e,i,n)||a===0&&ar(e,t,n))}function ar(i,t,e){return t.x<=Math.max(i.x,e.x)&&t.x>=Math.min(i.x,e.x)&&t.y<=Math.max(i.y,e.y)&&t.y>=Math.min(i.y,e.y)}function lr(i){return i>0?1:i<0?-1:0}function Id(i,t){let e=i;do{if(e.i!==i.i&&e.next.i!==i.i&&e.i!==t.i&&e.next.i!==t.i&&uh(e,e.next,i,t))return!0;e=e.next}while(e!==i);return!1}function Ps(i,t){return ve(i.prev,i,i.next)<0?ve(i,t,i.next)>=0&&ve(i,i.prev,t)>=0:ve(i,t,i.prev)<0||ve(i,i.next,t)<0}function Nd(i,t){let e=i,n=!1;const s=(i.x+t.x)/2,r=(i.y+t.y)/2;do e.y>r!=e.next.y>r&&e.next.y!==e.y&&s<(e.next.x-e.x)*(r-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==i);return n}function dh(i,t){const e=pa(i.i,i.x,i.y),n=pa(t.i,t.x,t.y),s=i.next,r=t.prev;return i.next=t,t.prev=i,e.next=s,s.prev=e,n.next=e,e.prev=n,r.next=n,n.prev=r,n}function Hl(i,t,e,n){const s=pa(i,t,e);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function Ls(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function pa(i,t,e){return{i,x:t,y:e,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function Ud(i,t,e,n){let s=0;for(let r=t,o=e-n;r<e;r+=n)s+=(i[o]-i[r])*(i[r+1]+i[o+1]),o=r;return s}class Fd{static triangulate(t,e,n=2){return vd(t,e,n)}}class Ss{static area(t){const e=t.length;let n=0;for(let s=e-1,r=0;r<e;s=r++)n+=t[s].x*t[r].y-t[r].x*t[s].y;return n*.5}static isClockWise(t){return Ss.area(t)<0}static triangulateShape(t,e){const n=[],s=[],r=[];Vl(t),Wl(n,t);let o=t.length;e.forEach(Vl);for(let l=0;l<e.length;l++)s.push(o),o+=e[l].length,Wl(n,e[l]);const a=Fd.triangulate(n,s);for(let l=0;l<a.length;l+=3)r.push(a.slice(l,l+3));return r}}function Vl(i){const t=i.length;t>2&&i[t-1].equals(i[0])&&i.pop()}function Wl(i,t){for(let e=0;e<t.length;e++)i.push(t[e].x),i.push(t[e].y)}class Lr extends Me{constructor(t=[new ot(0,-.5),new ot(.5,0),new ot(0,.5)],e=12,n=0,s=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:t,segments:e,phiStart:n,phiLength:s},e=Math.floor(e),s=Vt(s,0,Math.PI*2);const r=[],o=[],a=[],l=[],c=[],h=1/e,u=new R,d=new ot,f=new R,_=new R,M=new R;let p=0,m=0;for(let x=0;x<=t.length-1;x++)switch(x){case 0:p=t[x+1].x-t[x].x,m=t[x+1].y-t[x].y,f.x=m*1,f.y=-p,f.z=m*0,M.copy(f),f.normalize(),l.push(f.x,f.y,f.z);break;case t.length-1:M.normalize(),l.push(M.x,M.y,M.z);break;default:p=t[x+1].x-t[x].x,m=t[x+1].y-t[x].y,f.x=m*1,f.y=-p,f.z=m*0,_.copy(f),f.x+=M.x,f.y+=M.y,f.z+=M.z,f.normalize(),l.push(f.x,f.y,f.z),M.copy(_)}for(let x=0;x<=e;x++){const y=n+x*h*s,v=Math.sin(y),T=Math.cos(y);for(let b=0;b<=t.length-1;b++){u.x=t[b].x*v,u.y=t[b].y,u.z=t[b].x*T,o.push(u.x,u.y,u.z),d.x=x/e,d.y=b/(t.length-1),a.push(d.x,d.y);const g=l[3*b+0]*v,w=l[3*b+1],P=l[3*b+0]*T;c.push(g,w,P)}}for(let x=0;x<e;x++)for(let y=0;y<t.length-1;y++){const v=y+x*t.length,T=v,b=v+t.length,g=v+t.length+1,w=v+1;r.push(T,b,w),r.push(g,w,b)}this.setIndex(r),this.setAttribute("position",new Ht(o,3)),this.setAttribute("uv",new Ht(a,2)),this.setAttribute("normal",new Ht(c,3))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Lr(t.points,t.segments,t.phiStart,t.phiLength)}}class ts extends Me{constructor(t=1,e=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:s};const r=t/2,o=e/2,a=Math.floor(n),l=Math.floor(s),c=a+1,h=l+1,u=t/a,d=e/l,f=[],_=[],M=[],p=[];for(let m=0;m<h;m++){const x=m*d-o;for(let y=0;y<c;y++){const v=y*u-r;_.push(v,-x,0),M.push(0,0,1),p.push(y/a),p.push(1-m/l)}}for(let m=0;m<l;m++)for(let x=0;x<a;x++){const y=x+c*m,v=x+c*(m+1),T=x+1+c*(m+1),b=x+1+c*m;f.push(y,v,b),f.push(v,T,b)}this.setIndex(f),this.setAttribute("position",new Ht(_,3)),this.setAttribute("normal",new Ht(M,3)),this.setAttribute("uv",new Ht(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ts(t.width,t.height,t.widthSegments,t.heightSegments)}}class Gr extends Me{constructor(t=new Va([new ot(0,.5),new ot(-.5,-.5),new ot(.5,-.5)]),e=12){super(),this.type="ShapeGeometry",this.parameters={shapes:t,curveSegments:e};const n=[],s=[],r=[],o=[];let a=0,l=0;if(Array.isArray(t)===!1)c(t);else for(let h=0;h<t.length;h++)c(t[h]),this.addGroup(a,l,h),a+=l,l=0;this.setIndex(n),this.setAttribute("position",new Ht(s,3)),this.setAttribute("normal",new Ht(r,3)),this.setAttribute("uv",new Ht(o,2));function c(h){const u=s.length/3,d=h.extractPoints(e);let f=d.shape;const _=d.holes;Ss.isClockWise(f)===!1&&(f=f.reverse());for(let p=0,m=_.length;p<m;p++){const x=_[p];Ss.isClockWise(x)===!0&&(_[p]=x.reverse())}const M=Ss.triangulateShape(f,_);for(let p=0,m=_.length;p<m;p++){const x=_[p];f=f.concat(x)}for(let p=0,m=f.length;p<m;p++){const x=f[p];s.push(x.x,x.y,0),r.push(0,0,1),o.push(x.x,x.y)}for(let p=0,m=M.length;p<m;p++){const x=M[p],y=x[0]+u,v=x[1]+u,T=x[2]+u;n.push(y,v,T),l+=3}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){const t=super.toJSON(),e=this.parameters.shapes;return Od(e,t)}static fromJSON(t,e){const n=[];for(let s=0,r=t.shapes.length;s<r;s++){const o=e[t.shapes[s]];n.push(o)}return new Gr(n,t.curveSegments)}}function Od(i,t){if(t.shapes=[],Array.isArray(i))for(let e=0,n=i.length;e<n;e++){const s=i[e];t.shapes.push(s.uuid)}else t.shapes.push(i.uuid);return t}class Le extends Me{constructor(t=1,e=32,n=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));const l=Math.min(o+a,Math.PI);let c=0;const h=[],u=new R,d=new R,f=[],_=[],M=[],p=[];for(let m=0;m<=n;m++){const x=[],y=m/n,v=o+y*a,T=t*Math.cos(v),b=Math.sqrt(t*t-T*T);let g=0;m===0&&o===0?g=.5/e:m===n&&l===Math.PI&&(g=-.5/e);for(let w=0;w<=e;w++){const P=w/e,C=s+P*r;u.x=-b*Math.cos(C),u.y=T,u.z=b*Math.sin(C),_.push(u.x,u.y,u.z),d.copy(u).normalize(),M.push(d.x,d.y,d.z),p.push(P+g,1-y),x.push(c++)}h.push(x)}for(let m=0;m<n;m++)for(let x=0;x<e;x++){const y=h[m][x+1],v=h[m][x],T=h[m+1][x],b=h[m+1][x+1];(m!==0||o>0)&&f.push(y,v,b),(m!==n-1||l<Math.PI)&&f.push(v,T,b)}this.setIndex(f),this.setAttribute("position",new Ht(_,3)),this.setAttribute("normal",new Ht(M,3)),this.setAttribute("uv",new Ht(p,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Le(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class si extends Me{constructor(t=1,e=.4,n=12,s=48,r=Math.PI*2,o=0,a=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:s,arc:r,thetaStart:o,thetaLength:a},n=Math.floor(n),s=Math.floor(s);const l=[],c=[],h=[],u=[],d=new R,f=new R,_=new R;for(let M=0;M<=n;M++){const p=o+M/n*a;for(let m=0;m<=s;m++){const x=m/s*r;f.x=(t+e*Math.cos(p))*Math.cos(x),f.y=(t+e*Math.cos(p))*Math.sin(x),f.z=e*Math.sin(p),c.push(f.x,f.y,f.z),d.x=t*Math.cos(x),d.y=t*Math.sin(x),_.subVectors(f,d).normalize(),h.push(_.x,_.y,_.z),u.push(m/s),u.push(M/n)}}for(let M=1;M<=n;M++)for(let p=1;p<=s;p++){const m=(s+1)*M+p-1,x=(s+1)*(M-1)+p-1,y=(s+1)*(M-1)+p,v=(s+1)*M+p;l.push(m,x,v),l.push(x,y,v)}this.setIndex(l),this.setAttribute("position",new Ht(c,3)),this.setAttribute("normal",new Ht(h,3)),this.setAttribute("uv",new Ht(u,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new si(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc,t.thetaStart,t.thetaLength)}}class He extends Me{constructor(t=new ah(new R(-1,-1,0),new R(-1,1,0),new R(1,1,0)),e=64,n=1,s=8,r=!1){super(),this.type="TubeGeometry",this.parameters={path:t,tubularSegments:e,radius:n,radialSegments:s,closed:r};const o=t.computeFrenetFrames(e,r);this.tangents=o.tangents,this.normals=o.normals,this.binormals=o.binormals;const a=new R,l=new R,c=new ot;let h=new R;const u=[],d=[],f=[],_=[];M(),this.setIndex(_),this.setAttribute("position",new Ht(u,3)),this.setAttribute("normal",new Ht(d,3)),this.setAttribute("uv",new Ht(f,2));function M(){for(let y=0;y<e;y++)p(y);p(r===!1?e:0),x(),m()}function p(y){h=t.getPointAt(y/e,h);const v=o.normals[y],T=o.binormals[y];for(let b=0;b<=s;b++){const g=b/s*Math.PI*2,w=Math.sin(g),P=-Math.cos(g);l.x=P*v.x+w*T.x,l.y=P*v.y+w*T.y,l.z=P*v.z+w*T.z,l.normalize(),d.push(l.x,l.y,l.z),a.x=h.x+n*l.x,a.y=h.y+n*l.y,a.z=h.z+n*l.z,u.push(a.x,a.y,a.z)}}function m(){for(let y=1;y<=e;y++)for(let v=1;v<=s;v++){const T=(s+1)*(y-1)+(v-1),b=(s+1)*y+(v-1),g=(s+1)*y+v,w=(s+1)*(y-1)+v;_.push(T,b,w),_.push(b,g,w)}}function x(){for(let y=0;y<=e;y++)for(let v=0;v<=s;v++)c.x=y/e,c.y=v/s,f.push(c.x,c.y)}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){const t=super.toJSON();return t.path=this.parameters.path.toJSON(),t}static fromJSON(t){return new He(new da[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}}function es(i){const t={};for(const e in i){t[e]={};for(const n in i[e]){const s=i[e][n];if(Xl(s))s.isRenderTargetTexture?(Ot("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=s.clone();else if(Array.isArray(s))if(Xl(s[0])){const r=[];for(let o=0,a=s.length;o<a;o++)r[o]=s[o].clone();t[e][n]=r}else t[e][n]=s.slice();else t[e][n]=s}}return t}function tn(i){const t={};for(let e=0;e<i.length;e++){const n=es(i[e]);for(const s in n)t[s]=n[s]}return t}function Xl(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function zd(i){const t=[];for(let e=0;e<i.length;e++)t.push(i[e].clone());return t}function fh(i){const t=i.getRenderTarget();return t===null?i.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Kt.workingColorSpace}const Bd={clone:es,merge:tn};var Gd=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,kd=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class bn extends bi{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Gd,this.fragmentShader=kd,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=es(t.uniforms),this.uniformsGroups=zd(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this.defaultAttributeValues=Object.assign({},t.defaultAttributeValues),this.index0AttributeName=t.index0AttributeName,this.uniformsNeedUpdate=t.uniformsNeedUpdate,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const s in this.uniforms){const o=this.uniforms[s].value;o&&o.isTexture?e.uniforms[s]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[s]={type:"m4",value:o.toArray()}:e.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}fromJSON(t,e){if(super.fromJSON(t,e),t.uniforms!==void 0)for(const n in t.uniforms){const s=t.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=e[s.value]||null;break;case"c":this.uniforms[n].value=new wt().setHex(s.value);break;case"v2":this.uniforms[n].value=new ot().fromArray(s.value);break;case"v3":this.uniforms[n].value=new R().fromArray(s.value);break;case"v4":this.uniforms[n].value=new xe().fromArray(s.value);break;case"m3":this.uniforms[n].value=new Bt().fromArray(s.value);break;case"m4":this.uniforms[n].value=new he().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(t.defines!==void 0&&(this.defines=t.defines),t.vertexShader!==void 0&&(this.vertexShader=t.vertexShader),t.fragmentShader!==void 0&&(this.fragmentShader=t.fragmentShader),t.glslVersion!==void 0&&(this.glslVersion=t.glslVersion),t.extensions!==void 0)for(const n in t.extensions)this.extensions[n]=t.extensions[n];return t.lights!==void 0&&(this.lights=t.lights),t.clipping!==void 0&&(this.clipping=t.clipping),this}}class Hd extends bn{constructor(t){super(t),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class Xt extends bi{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new wt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new wt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ha,this.normalScale=new ot(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new hi,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class Vd extends bi{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=hu,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class Wd extends bi{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}class Wa extends De{static registerNode(t){this.prototype._lightNode=t}constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new wt(t),this.intensity=e}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,e}}class Xd extends Wa{constructor(t,e,n){super(t,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(De.DEFAULT_UP),this.updateMatrix(),this.groundColor=new wt(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}toJSON(t){const e=super.toJSON(t);return e.object.groundColor=this.groundColor.getHex(),e}}const Mo=new he,Yl=new R,ql=new R;class ph{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ot(512,512),this.mapType=mn,this.map=null,this.mapPass=null,this.matrix=new he,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Rs,this._frameExtents=new ot(1,1),this._viewportCount=1,this._viewports=[new xe(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera;Yl.setFromMatrixPosition(t.matrixWorld),e.position.copy(Yl),ql.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(ql),e.updateMatrixWorld(),this._updateMatrix(e,this.matrix,this._frustum)}_updateMatrix(t,e,n,s){Mo.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),n.setFromProjectionMatrix(Mo,t.coordinateSystem,t.reversedDepth);const r=this._frameExtents,o=s?s.z/r.x:1,a=s?s.w/r.y:1,l=s?s.x/r.x:0,c=s?s.y/r.y:0;t.coordinateSystem===Ts||t.reversedDepth?e.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,1,0,0,0,0,1):e.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,.5,.5,0,0,0,1),e.multiply(Mo)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this.mapType=t.mapType,this.biasNode=t.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return t.intensity=this.intensity,t.bias=this.bias,t.normalBias=this.normalBias,t.radius=this.radius,t.blurSamples=this.blurSamples,t.mapSize=this.mapSize.toArray(),t.mapType=this.mapType,t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}const cr=new R,hr=new ci,Tn=new R;class mh extends De{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new he,this.projectionMatrix=new he,this.projectionMatrixInverse=new he,this.coordinateSystem=En,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorld.decompose(cr,hr,Tn),Tn.x===1&&Tn.y===1&&Tn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(cr,hr,Tn.set(1,1,1)).invert()}updateWorldMatrix(t,e,n=!1){super.updateWorldMatrix(t,e,n),this.matrixWorld.decompose(cr,hr,Tn),Tn.x===1&&Tn.y===1&&Tn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(cr,hr,Tn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const ei=new R,Zl=new ot,Kl=new ot;class _n extends mh{constructor(t=50,e=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=As*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(_s*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return As*2*Math.atan(Math.tan(_s*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,n){ei.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(ei.x,ei.y).multiplyScalar(-t/ei.z),ei.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(ei.x,ei.y).multiplyScalar(-t/ei.z)}getViewSize(t,e){return this.getViewBounds(t,Zl,Kl),e.subVectors(Kl,Zl)}setViewOffset(t,e,n,s,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(_s*.5*this.fov)/this.zoom,n=2*e,s=this.aspect*n,r=-.5*s;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,e-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}const a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-n,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}class Yd extends ph{constructor(){super(new _n(90,1,.5,500)),this.isPointLightShadow=!0}}class ma extends Wa{constructor(t,e,n=0,s=2){super(t,e),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new Yd}get power(){return this.intensity*4*Math.PI}set power(t){this.intensity=t/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(t,e){return super.copy(t,e),this.distance=t.distance,this.decay=t.decay,this.shadow=t.shadow.clone(),this}toJSON(t){const e=super.toJSON(t);return e.object.distance=this.distance,e.object.decay=this.decay,e.object.shadow=this.shadow.toJSON(),e}}class gh extends mh{constructor(t=-1,e=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=n-t,o=n+t,a=s+e,l=s-e;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}class qd extends ph{constructor(){super(new gh(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class _h extends Wa{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(De.DEFAULT_UP),this.updateMatrix(),this.target=new De,this.shadow=new qd}dispose(){super.dispose(),this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}toJSON(t){const e=super.toJSON(t);return e.object.shadow=this.shadow.toJSON(),e.object.target=this.target.uuid,e}}const ki=-90,Hi=1;class ga extends De{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new _n(ki,Hi,t,e);s.layers=this.layers,this.add(s);const r=new _n(ki,Hi,t,e);r.layers=this.layers,this.add(r);const o=new _n(ki,Hi,t,e);o.layers=this.layers,this.add(o);const a=new _n(ki,Hi,t,e);a.layers=this.layers,this.add(a);const l=new _n(ki,Hi,t,e);l.layers=this.layers,this.add(l);const c=new _n(ki,Hi,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,s,r,o,a,l]=e;for(const c of e)this.remove(c);if(t===En)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===Ts)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,l,c,h]=this.children,u=t.getRenderTarget(),d=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),_=t.xr.enabled;t.xr.enabled=!1;const M=n.texture.mipmapsAutoUpdate;n.texture.mipmapsAutoUpdate=!1;let p=!1;t.isWebGLRenderer===!0?p=t.state.buffers.depth.getReversed():p=t.reversedDepthBuffer,t.setRenderTarget(n,0,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,r),t.setRenderTarget(n,1,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,o),t.setRenderTarget(n,2,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,a),t.setRenderTarget(n,3,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,l),t.setRenderTarget(n,4,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,c),n.texture.mipmapsAutoUpdate=M,t.setRenderTarget(n,5,s),p&&t.autoClear===!1&&t.clearDepth(),t.render(e,h),t.setRenderTarget(u,d,f),t.xr.enabled=_,n.texture.needsPMREMUpdate=!0}}class Zd extends _n{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t,this.perCameraFrustumCulled=!1}}class Jl{constructor(t=1,e=0,n=0){this.radius=t,this.phi=e,this.theta=n}set(t,e,n){return this.radius=t,this.phi=e,this.theta=n,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=Vt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,n){return this.radius=Math.sqrt(t*t+e*e+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,n),this.phi=Math.acos(Vt(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}class Kd extends ui{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}}function $l(i,t,e,n){const s=Jd(n);switch(e){case zc:return i*t;case Gc:return i*t/s.components*s.byteLength;case Aa:return i*t/s.components*s.byteLength;case wi:return i*t*2/s.components*s.byteLength;case Ra:return i*t*2/s.components*s.byteLength;case Bc:return i*t*3/s.components*s.byteLength;case Pn:return i*t*4/s.components*s.byteLength;case Ca:return i*t*4/s.components*s.byteLength;case mr:case gr:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case _r:case xr:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Uo:case Oo:return Math.max(i,16)*Math.max(t,8)/4;case No:case Fo:return Math.max(i,8)*Math.max(t,8)/2;case zo:case Bo:case ko:case Ho:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*8;case Go:case wr:case Vo:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Wo:return Math.floor((i+3)/4)*Math.floor((t+3)/4)*16;case Xo:return Math.floor((i+4)/5)*Math.floor((t+3)/4)*16;case Yo:return Math.floor((i+4)/5)*Math.floor((t+4)/5)*16;case qo:return Math.floor((i+5)/6)*Math.floor((t+4)/5)*16;case Zo:return Math.floor((i+5)/6)*Math.floor((t+5)/6)*16;case Ko:return Math.floor((i+7)/8)*Math.floor((t+4)/5)*16;case Jo:return Math.floor((i+7)/8)*Math.floor((t+5)/6)*16;case $o:return Math.floor((i+7)/8)*Math.floor((t+7)/8)*16;case Qo:return Math.floor((i+9)/10)*Math.floor((t+4)/5)*16;case jo:return Math.floor((i+9)/10)*Math.floor((t+5)/6)*16;case ta:return Math.floor((i+9)/10)*Math.floor((t+7)/8)*16;case ea:return Math.floor((i+9)/10)*Math.floor((t+9)/10)*16;case na:return Math.floor((i+11)/12)*Math.floor((t+9)/10)*16;case ia:return Math.floor((i+11)/12)*Math.floor((t+11)/12)*16;case sa:case ra:case oa:return Math.ceil(i/4)*Math.ceil(t/4)*16;case aa:case la:return Math.ceil(i/4)*Math.ceil(t/4)*8;case Er:case ca:return Math.ceil(i/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function Jd(i){switch(i){case mn:case Nc:return{byteLength:1,components:1};case bs:case Uc:case In:return{byteLength:2,components:1};case ba:case Ta:return{byteLength:2,components:4};case Dn:case Ea:case Cn:return{byteLength:4,components:1};case Fc:case Oc:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:ya}}));typeof window<"u"&&(window.__THREE__?Ot("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=ya);function xh(){let i=null,t=!1,e=null,n=null;function s(r,o){n=i.requestAnimationFrame(s),e(r,o)}return{start:function(){t!==!0&&e!==null&&i!==null&&(n=i.requestAnimationFrame(s),t=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){i=r}}}function $d(i){const t=new WeakMap;function e(a,l){const c=a.array,h=a.usage,u=c.byteLength,d=i.createBuffer();i.bindBuffer(l,d),i.bufferData(l,c,h),a.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:u}}function n(a,l,c){const h=l.array,u=l.updateRanges;if(i.bindBuffer(c,a),u.length===0)i.bufferSubData(c,0,h);else{u.sort((f,_)=>f.start-_.start);let d=0;for(let f=1;f<u.length;f++){const _=u[d],M=u[f];M.start<=_.start+_.count+1?_.count=Math.max(_.count,M.start+M.count-_.start):(++d,u[d]=M)}u.length=d+1;for(let f=0,_=u.length;f<_;f++){const M=u[f];i.bufferSubData(c,M.start*h.BYTES_PER_ELEMENT,h,M.start,M.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=t.get(a);l&&(i.deleteBuffer(l.buffer),t.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=t.get(a);(!h||h.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var Qd=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,jd=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,tf=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,ef=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,nf=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,sf=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,rf=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,of=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,af=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,lf=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,cf=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,hf=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,uf=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,df=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,ff=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,pf=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,mf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,gf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,_f=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,xf=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,vf=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Mf=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Sf=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,yf=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,wf=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,Ef=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,bf=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Tf=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Af=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Rf="gl_FragColor = linearToOutputTexel( gl_FragColor );",Cf=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Pf=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,Lf=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`,Df=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,If=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Nf=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Uf=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Ff=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Of=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,zf=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Bf=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Gf=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,kf=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Hf=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Vf=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,Wf=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureLod( envMap, envMapRotation * retroVec, roughnessToMip( roughness ) );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_PMREM
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,Xf=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Yf=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,qf=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Zf=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Kf=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.045 );
material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef USE_DIFFUSE_ROUGHNESS
	float diffuseRoughnessFactor = diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		diffuseRoughnessFactor *= texture2D( diffuseRoughnessMap, vDiffuseRoughnessMapUv ).r;
	#endif
	material.diffuseRoughness = saturate( diffuseRoughnessFactor );
#endif
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.045 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Jf=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float diffuseRoughness;
	#endif
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
#ifdef USE_DIFFUSE_ROUGHNESS
	const float EON_EPSILON = 1e-7;
	float FON_DirectionalAlbedo( const in float mu, const in float roughness, const in float A ) {
		float muComp = 1.0 - mu;
		float gOverPi = muComp * ( 0.0571085289 + muComp * ( 0.491881867 + muComp * ( - 0.332181442 + muComp * 0.0714429953 ) ) );
		return A * ( 1.0 + roughness * gOverPi );
	}
	vec3 BRDF_EON( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 diffuseColor, const in float roughness ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return BRDF_Lambert( rho );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float s = dot( lightDir, viewDir ) - dotNL * dotNV;
		float sOverT = ( s > 0.0 ) ? s / max( max( dotNL, dotNV ), EON_EPSILON ) : s;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		vec3 singleScatter = rho * RECIPROCAL_PI * A * ( 1.0 + roughness * sOverT );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		float albedoV = FON_DirectionalAlbedo( dotNV, roughness, A );
		float albedoL = FON_DirectionalAlbedo( dotNL, roughness, A );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		vec3 multiScatter = rhoMultiScatter * RECIPROCAL_PI
			* max( EON_EPSILON, 1.0 - albedoV )
			* max( EON_EPSILON, 1.0 - albedoL )
			/ max( EON_EPSILON, 1.0 - averageAlbedo );
		return singleScatter + multiScatter;
	}
	vec3 EON_DirectionalAlbedo( const in vec3 diffuseColor, const in float roughness, const in float dotNV ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return rho;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		float directionalAlbedo = FON_DirectionalAlbedo( dotNV, roughness, A );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		return rho * directionalAlbedo + rhoMultiScatter * ( 1.0 - directionalAlbedo );
	}
#endif
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = max( material.clearcoatRoughness, 0.045 );
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = max( material.roughness, 0.045 );
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float alphaT = max( material.alphaT, alpha );
		float V = V_GGX_SmithCorrelated_Anisotropic( alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		vec3 diffuseBRDF = BRDF_EON( directLight.direction, geometryViewDir, geometryNormal, material.diffuseColor, material.diffuseRoughness ) * ( 1.0 - material.metalness );
	#else
		vec3 diffuseBRDF = BRDF_Lambert( material.diffuseContribution );
	#endif
	reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuseAlbedo = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness );
		vec3 diffuse = irradiance * RECIPROCAL_PI * diffuseAlbedo * ( 1.0 - singleScattering - multiScattering );
	#else
		vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#endif
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuse = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness ) * ( 1.0 - totalScatteringDielectric );
	#else
		vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	#endif
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,$f=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		int probeGrid = - 1;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( isInsideLightProbeGrid( probeWorldPos, probeWorldNormal, probesMin[ i ], probesMax[ i ], probesResolution[ i ] ) ) probeGrid = UNROLLED_LOOP_INDEX;
		}
		#pragma unroll_loop_end
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( probeGrid == UNROLLED_LOOP_INDEX ) irradiance += getLightProbeGridIrradiance( probesSH[ i ], probesMin[ i ], probesMax[ i ], probesResolution[ i ], probeWorldPos, probeWorldNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Qf=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,jf=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,tp=`#if NUM_LIGHT_PROBE_GRIDS > 0
uniform highp sampler3D probesSH[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMin[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMax[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesResolution[ NUM_LIGHT_PROBE_GRIDS ];
bool isInsideLightProbeGrid( vec3 worldPos, vec3 worldNormal, vec3 probesMin, vec3 probesMax, vec3 probesResolution ) {
	vec3 spacing = ( probesMax - probesMin ) / probesResolution;
	vec3 samplePos = worldPos + worldNormal * spacing * 0.5;
	vec3 margin = spacing * 0.01;
	return all( greaterThanEqual( samplePos, probesMin - margin ) ) && all( lessThanEqual( samplePos, probesMax + margin ) );
}
vec3 getLightProbeGridIrradiance( highp sampler3D probesSH, vec3 probesMin, vec3 probesMax, vec3 probesResolution, vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 probeSpacing = gridRange / res;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.5 / res, 1.0 - 0.5 / res );
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,ep=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,np=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,ip=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,sp=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,rp=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,op=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,ap=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,lp=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,cp=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,hp=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,up=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,dp=`#if defined( USE_MORPHCOLORS )
	#if defined( USE_COLOR_ALPHA )
		vColor *= morphTargetBaseInfluence;
	#elif defined( USE_COLOR )
		vColor.rgb *= morphTargetBaseInfluence;
	#endif
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,fp=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,pp=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,mp=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,gp=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,_p=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,xp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,vp=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Mp=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,Sp=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,yp=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,wp=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Ep=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,bp=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Tp=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Ap=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,Rp=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Cp=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Pp=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Lp=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Dp=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Ip=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Np=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float lightDistance = length( lightToPosition );
			float depthRange = shadowCameraFar - shadowCameraNear;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float depthA = - shadowCameraNear / depthRange - shadowBias;
				float depthB = shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#else
				float depthA = shadowCameraFar / depthRange + shadowBias;
				float depthB = - shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			shadow = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 offset = vogelDiskSample( i, 5, phi );
				vec3 direction = bd3D + ( tangent * offset.x + bitangent * offset.y ) * texelSize;
				vec3 absDirection = abs( direction );
				float dp = depthA + depthB / max( max( absDirection.x, absDirection.y ), absDirection.z );
				shadow += texture( shadowMap, vec4( direction, dp ) );
			}
			shadow *= 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Up=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Fp=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Op=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,zp=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Bp=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Gp=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,kp=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Hp=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Vp=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Wp=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Xp=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Yp=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,qp=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Zp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Kp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	uniform mat3 diffuseRoughnessMapTransform;
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Jp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	vDiffuseRoughnessMapUv = ( diffuseRoughnessMapTransform * vec3( DIFFUSE_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,$p=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Qp=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,jp=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,tm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,em=`uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <envmap_common_pars_fragment>
void main() {
	#ifdef ENVMAP_TYPE_PMREM
		vec4 texColor = textureLod( envMap, backgroundRotation * vWorldDirection, roughnessToMip( backgroundBlurriness ) );
	#else
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,nm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,im=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,sm=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,rm=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,om=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,am=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,lm=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,cm=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,hm=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,um=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,dm=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,fm=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,pm=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,mm=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,gm=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,_m=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,xm=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,vm=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Mm=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Sm=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ym=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,wm=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DIFFUSE_ROUGHNESS
	uniform float diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		uniform sampler2D diffuseRoughnessMap;
	#endif
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Em=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,bm=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Tm=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Am=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Rm=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Cm=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Pm=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Lm=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Wt={alphahash_fragment:Qd,alphahash_pars_fragment:jd,alphamap_fragment:tf,alphamap_pars_fragment:ef,alphatest_fragment:nf,alphatest_pars_fragment:sf,aomap_fragment:rf,aomap_pars_fragment:of,batching_pars_vertex:af,batching_vertex:lf,begin_vertex:cf,beginnormal_vertex:hf,bsdfs:uf,iridescence_fragment:df,bumpmap_pars_fragment:ff,clipping_planes_fragment:pf,clipping_planes_pars_fragment:mf,clipping_planes_pars_vertex:gf,clipping_planes_vertex:_f,color_fragment:xf,color_pars_fragment:vf,color_pars_vertex:Mf,color_vertex:Sf,common:yf,defaultnormal_vertex:wf,displacementmap_pars_vertex:Ef,displacementmap_vertex:bf,emissivemap_fragment:Tf,emissivemap_pars_fragment:Af,colorspace_fragment:Rf,colorspace_pars_fragment:Cf,envmap_fragment:Pf,envmap_common_pars_fragment:Lf,envmap_pars_fragment:Df,envmap_pars_vertex:If,envmap_physical_pars_fragment:Wf,envmap_vertex:Nf,fog_vertex:Uf,fog_pars_vertex:Ff,fog_fragment:Of,fog_pars_fragment:zf,gradientmap_pars_fragment:Bf,lightmap_pars_fragment:Gf,lights_lambert_fragment:kf,lights_lambert_pars_fragment:Hf,lights_pars_begin:Vf,lights_toon_fragment:Xf,lights_toon_pars_fragment:Yf,lights_phong_fragment:qf,lights_phong_pars_fragment:Zf,lights_physical_fragment:Kf,lights_physical_pars_fragment:Jf,lights_fragment_begin:$f,lights_fragment_maps:Qf,lights_fragment_end:jf,lightprobes_pars_fragment:tp,logdepthbuf_fragment:ep,logdepthbuf_pars_fragment:np,logdepthbuf_pars_vertex:ip,logdepthbuf_vertex:sp,map_fragment:rp,map_pars_fragment:op,map_particle_fragment:ap,map_particle_pars_fragment:lp,metalnessmap_fragment:cp,metalnessmap_pars_fragment:hp,morphinstance_vertex:up,morphcolor_vertex:dp,morphnormal_vertex:fp,morphtarget_pars_vertex:pp,morphtarget_vertex:mp,normal_fragment_begin:gp,normal_fragment_maps:_p,normal_pars_fragment:xp,normal_pars_vertex:vp,normal_vertex:Mp,normalmap_pars_fragment:Sp,clearcoat_normal_fragment_begin:yp,clearcoat_normal_fragment_maps:wp,clearcoat_pars_fragment:Ep,iridescence_pars_fragment:bp,opaque_fragment:Tp,packing:Ap,premultiplied_alpha_fragment:Rp,project_vertex:Cp,dithering_fragment:Pp,dithering_pars_fragment:Lp,roughnessmap_fragment:Dp,roughnessmap_pars_fragment:Ip,shadowmap_pars_fragment:Np,shadowmap_pars_vertex:Up,shadowmap_vertex:Fp,shadowmask_pars_fragment:Op,skinbase_vertex:zp,skinning_pars_vertex:Bp,skinning_vertex:Gp,skinnormal_vertex:kp,specularmap_fragment:Hp,specularmap_pars_fragment:Vp,tonemapping_fragment:Wp,tonemapping_pars_fragment:Xp,transmission_fragment:Yp,transmission_pars_fragment:qp,uv_pars_fragment:Zp,uv_pars_vertex:Kp,uv_vertex:Jp,worldpos_vertex:$p,background_vert:Qp,background_frag:jp,backgroundCube_vert:tm,backgroundCube_frag:em,cube_vert:nm,cube_frag:im,depth_vert:sm,depth_frag:rm,distance_vert:om,distance_frag:am,equirect_vert:lm,equirect_frag:cm,linedashed_vert:hm,linedashed_frag:um,meshbasic_vert:dm,meshbasic_frag:fm,meshlambert_vert:pm,meshlambert_frag:mm,meshmatcap_vert:gm,meshmatcap_frag:_m,meshnormal_vert:xm,meshnormal_frag:vm,meshphong_vert:Mm,meshphong_frag:Sm,meshphysical_vert:ym,meshphysical_frag:wm,meshtoon_vert:Em,meshtoon_frag:bm,points_vert:Tm,points_frag:Am,shadow_vert:Rm,shadow_frag:Cm,sprite_vert:Pm,sprite_frag:Lm},yt={common:{diffuse:{value:new wt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Bt},alphaMap:{value:null},alphaMapTransform:{value:new Bt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Bt}},envmap:{envMap:{value:null},envMapRotation:{value:new Bt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Bt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Bt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Bt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Bt},normalScale:{value:new ot(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Bt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Bt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Bt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Bt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new wt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:[]},probesMin:{value:[]},probesMax:{value:[]},probesResolution:{value:[]}},points:{diffuse:{value:new wt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Bt},alphaTest:{value:0},uvTransform:{value:new Bt}},sprite:{diffuse:{value:new wt(16777215)},opacity:{value:1},center:{value:new ot(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Bt},alphaMap:{value:null},alphaMapTransform:{value:new Bt},alphaTest:{value:0}}},Rn={basic:{uniforms:tn([yt.common,yt.specularmap,yt.envmap,yt.aomap,yt.lightmap,yt.fog]),vertexShader:Wt.meshbasic_vert,fragmentShader:Wt.meshbasic_frag},lambert:{uniforms:tn([yt.common,yt.specularmap,yt.envmap,yt.aomap,yt.lightmap,yt.emissivemap,yt.bumpmap,yt.normalmap,yt.displacementmap,yt.fog,yt.lights,{emissive:{value:new wt(0)},envMapIntensity:{value:1}}]),vertexShader:Wt.meshlambert_vert,fragmentShader:Wt.meshlambert_frag},phong:{uniforms:tn([yt.common,yt.specularmap,yt.envmap,yt.aomap,yt.lightmap,yt.emissivemap,yt.bumpmap,yt.normalmap,yt.displacementmap,yt.fog,yt.lights,{emissive:{value:new wt(0)},specular:{value:new wt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Wt.meshphong_vert,fragmentShader:Wt.meshphong_frag},standard:{uniforms:tn([yt.common,yt.envmap,yt.aomap,yt.lightmap,yt.emissivemap,yt.bumpmap,yt.normalmap,yt.displacementmap,yt.roughnessmap,yt.metalnessmap,yt.fog,yt.lights,{emissive:{value:new wt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Wt.meshphysical_vert,fragmentShader:Wt.meshphysical_frag},toon:{uniforms:tn([yt.common,yt.aomap,yt.lightmap,yt.emissivemap,yt.bumpmap,yt.normalmap,yt.displacementmap,yt.gradientmap,yt.fog,yt.lights,{emissive:{value:new wt(0)}}]),vertexShader:Wt.meshtoon_vert,fragmentShader:Wt.meshtoon_frag},matcap:{uniforms:tn([yt.common,yt.bumpmap,yt.normalmap,yt.displacementmap,yt.fog,{matcap:{value:null}}]),vertexShader:Wt.meshmatcap_vert,fragmentShader:Wt.meshmatcap_frag},points:{uniforms:tn([yt.points,yt.fog]),vertexShader:Wt.points_vert,fragmentShader:Wt.points_frag},dashed:{uniforms:tn([yt.common,yt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Wt.linedashed_vert,fragmentShader:Wt.linedashed_frag},depth:{uniforms:tn([yt.common,yt.displacementmap]),vertexShader:Wt.depth_vert,fragmentShader:Wt.depth_frag},normal:{uniforms:tn([yt.common,yt.bumpmap,yt.normalmap,yt.displacementmap,{opacity:{value:1}}]),vertexShader:Wt.meshnormal_vert,fragmentShader:Wt.meshnormal_frag},sprite:{uniforms:tn([yt.sprite,yt.fog]),vertexShader:Wt.sprite_vert,fragmentShader:Wt.sprite_frag},background:{uniforms:{uvTransform:{value:new Bt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Wt.background_vert,fragmentShader:Wt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Bt}},vertexShader:Wt.backgroundCube_vert,fragmentShader:Wt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Wt.cube_vert,fragmentShader:Wt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Wt.equirect_vert,fragmentShader:Wt.equirect_frag},distance:{uniforms:tn([yt.common,yt.displacementmap,{referencePosition:{value:new R},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Wt.distance_vert,fragmentShader:Wt.distance_frag},shadow:{uniforms:tn([yt.lights,yt.fog,{color:{value:new wt(0)},opacity:{value:1}}]),vertexShader:Wt.shadow_vert,fragmentShader:Wt.shadow_frag}};Rn.physical={uniforms:tn([Rn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Bt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Bt},clearcoatNormalScale:{value:new ot(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Bt},diffuseRoughness:{value:0},diffuseRoughnessMap:{value:null},diffuseRoughnessMapTransform:{value:new Bt},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Bt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Bt},sheen:{value:0},sheenColor:{value:new wt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Bt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Bt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Bt},transmissionSamplerSize:{value:new ot},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Bt},attenuationDistance:{value:0},attenuationColor:{value:new wt(0)},specularColor:{value:new wt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Bt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Bt},anisotropyVector:{value:new ot},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Bt}}]),vertexShader:Wt.meshphysical_vert,fragmentShader:Wt.meshphysical_frag};const ur={r:0,b:0,g:0},Dm=new he,vh=new Bt;vh.set(-1,0,0,0,1,0,0,0,1);function Im(i,t,e,n,s,r){const o=new wt(0);let a=s===!0?0:1,l,c,h=null,u=0,d=null;function f(x){let y=x.isScene===!0?x.background:null;if(y&&y.isTexture){const v=x.backgroundBlurriness>0;y=t.get(y,v)}return y}function _(x){let y=!1;const v=f(x);v===null?p(o,a):v&&v.isColor&&(p(v,1),y=!0);const T=i.xr.getEnvironmentBlendMode();T==="additive"?e.buffers.color.setClear(0,0,0,1,r):T==="alpha-blend"&&e.buffers.color.setClear(0,0,0,0,r),(i.autoClear||y)&&(e.buffers.depth.setTest(!0),e.buffers.depth.setMask(!0),e.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function M(x,y){const v=f(y);v&&v.isCubeTexture?(c===void 0&&(c=new mt(new ln(1,1,1),new bn({name:"BackgroundCubeMaterial",uniforms:es(Rn.backgroundCube.uniforms),vertexShader:Rn.backgroundCube.vertexShader,fragmentShader:Rn.backgroundCube.fragmentShader,side:Je,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(T,b,g){this.matrixWorld.copyPosition(g.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=v,c.material.uniforms.backgroundBlurriness.value=y.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(Dm.makeRotationFromEuler(y.backgroundRotation)).transpose(),v.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(vh),c.material.toneMapped=Kt.getTransfer(v.colorSpace)!==re,(h!==v||u!==v.version||d!==i.toneMapping)&&(c.material.needsUpdate=!0,h=v,u=v.version,d=i.toneMapping),c.layers.enableAll(),x.unshift(c,c.geometry,c.material,0,0,null)):v&&v.isTexture&&(l===void 0&&(l=new mt(new ts(2,2),new bn({name:"BackgroundMaterial",uniforms:es(Rn.background.uniforms),vertexShader:Rn.background.vertexShader,fragmentShader:Rn.background.fragmentShader,side:yi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=v,l.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,l.material.toneMapped=Kt.getTransfer(v.colorSpace)!==re,v.matrixAutoUpdate===!0&&v.updateMatrix(),l.material.uniforms.uvTransform.value.copy(v.matrix),(h!==v||u!==v.version||d!==i.toneMapping)&&(l.material.needsUpdate=!0,h=v,u=v.version,d=i.toneMapping),l.layers.enableAll(),x.unshift(l,l.geometry,l.material,0,0,null))}function p(x,y){x.getRGB(ur,fh(i)),e.buffers.color.setClear(ur.r,ur.g,ur.b,y,r)}function m(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(x,y=1){o.set(x),a=y,p(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(x){a=x,p(o,a)},render:_,addToRenderList:M,dispose:m}}function Nm(i,t){const e=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=d(null);let r=s,o=!1;function a(D,F,U,L,V){let B=!1;const z=u(D,L,U,F);r!==z&&(r=z,c(r.object)),B=f(D,L,U,V),B&&_(D,L,U,V),V!==null&&t.update(V,i.ELEMENT_ARRAY_BUFFER),(B||o)&&(o=!1,v(D,F,U,L),V!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,t.get(V).buffer))}function l(){return i.createVertexArray()}function c(D){return i.bindVertexArray(D)}function h(D){return i.deleteVertexArray(D)}function u(D,F,U,L){const V=L.wireframe===!0;let B=n[F.id];B===void 0&&(B={},n[F.id]=B);const z=D.isInstancedMesh===!0?D.id:0;let nt=B[z];nt===void 0&&(nt={},B[z]=nt);let H=nt[U.id];H===void 0&&(H={},nt[U.id]=H);let Q=H[V];return Q===void 0&&(Q=d(l()),H[V]=Q),Q}function d(D){const F=[],U=[],L=[];for(let V=0;V<e;V++)F[V]=0,U[V]=0,L[V]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:F,enabledAttributes:U,attributeDivisors:L,object:D,attributes:{},index:null}}function f(D,F,U,L){const V=r.attributes,B=F.attributes;let z=0;const nt=U.getAttributes();for(const H in nt)if(nt[H].location>=0){const it=V[H];let _t=B[H];if(_t===void 0&&(H==="instanceMatrix"&&D.instanceMatrix&&(_t=D.instanceMatrix),H==="instanceColor"&&D.instanceColor&&(_t=D.instanceColor)),it===void 0||it.attribute!==_t||_t&&it.data!==_t.data)return!0;z++}return r.attributesNum!==z||r.index!==L}function _(D,F,U,L){const V={},B=F.attributes;let z=0;const nt=U.getAttributes();for(const H in nt)if(nt[H].location>=0){let it=B[H];it===void 0&&(H==="instanceMatrix"&&D.instanceMatrix&&(it=D.instanceMatrix),H==="instanceColor"&&D.instanceColor&&(it=D.instanceColor));const _t={};_t.attribute=it,it&&it.data&&(_t.data=it.data),V[H]=_t,z++}r.attributes=V,r.attributesNum=z,r.index=L}function M(){const D=r.newAttributes;for(let F=0,U=D.length;F<U;F++)D[F]=0}function p(D){m(D,0)}function m(D,F){const U=r.newAttributes,L=r.enabledAttributes,V=r.attributeDivisors;U[D]=1,L[D]===0&&(i.enableVertexAttribArray(D),L[D]=1),V[D]!==F&&(i.vertexAttribDivisor(D,F),V[D]=F)}function x(){const D=r.newAttributes,F=r.enabledAttributes;for(let U=0,L=F.length;U<L;U++)F[U]!==D[U]&&(i.disableVertexAttribArray(U),F[U]=0)}function y(D,F,U,L,V,B,z){z===!0?i.vertexAttribIPointer(D,F,U,V,B):i.vertexAttribPointer(D,F,U,L,V,B)}function v(D,F,U,L){M();const V=L.attributes,B=U.getAttributes(),z=F.defaultAttributeValues;for(const nt in B){const H=B[nt];if(H.location>=0){let Q=V[nt];if(Q===void 0&&(nt==="instanceMatrix"&&D.instanceMatrix&&(Q=D.instanceMatrix),nt==="instanceColor"&&D.instanceColor&&(Q=D.instanceColor)),Q!==void 0){const it=Q.normalized,_t=Q.itemSize,bt=t.get(Q);if(bt===void 0)continue;const K=bt.buffer,lt=bt.type,St=bt.bytesPerElement,Tt=lt===i.INT||lt===i.UNSIGNED_INT||Q.gpuType===Ea;if(Q.isInterleavedBufferAttribute){const gt=Q.data,Ft=gt.isInterleavedBuffer===!0?gt.stride:gt.itemSize,oe=Q.offset;if(gt.isInstancedInterleavedBuffer||gt.isInstancedBufferAttribute){for(let Pt=0;Pt<H.locationSize;Pt++)m(H.location+Pt,gt.meshPerAttribute);D.isInstancedMesh!==!0&&L._maxInstanceCount===void 0&&(L._maxInstanceCount=gt.meshPerAttribute*gt.count)}else for(let Pt=0;Pt<H.locationSize;Pt++)p(H.location+Pt);i.bindBuffer(i.ARRAY_BUFFER,K);for(let Pt=0;Pt<H.locationSize;Pt++)y(H.location+Pt,_t/H.locationSize,lt,it,Ft*St,(oe+_t/H.locationSize*Pt)*St,Tt)}else{if(Q.isInstancedBufferAttribute){for(let gt=0;gt<H.locationSize;gt++)m(H.location+gt,Q.meshPerAttribute);D.isInstancedMesh!==!0&&L._maxInstanceCount===void 0&&(L._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let gt=0;gt<H.locationSize;gt++)p(H.location+gt);i.bindBuffer(i.ARRAY_BUFFER,K);for(let gt=0;gt<H.locationSize;gt++)y(H.location+gt,_t/H.locationSize,lt,it,_t*St,_t/H.locationSize*gt*St,Tt)}}else if(z!==void 0){const it=z[nt];if(it!==void 0)switch(it.length){case 2:i.vertexAttrib2fv(H.location,it);break;case 3:i.vertexAttrib3fv(H.location,it);break;case 4:i.vertexAttrib4fv(H.location,it);break;default:i.vertexAttrib1fv(H.location,it)}}}}x()}function T(){P();for(const D in n){const F=n[D];for(const U in F){const L=F[U];for(const V in L){const B=L[V];for(const z in B)h(B[z].object),delete B[z];delete L[V]}}delete n[D]}}function b(D){if(n[D.id]===void 0)return;const F=n[D.id];for(const U in F){const L=F[U];for(const V in L){const B=L[V];for(const z in B)h(B[z].object),delete B[z];delete L[V]}}delete n[D.id]}function g(D){for(const F in n){const U=n[F];for(const L in U){const V=U[L];if(V[D.id]===void 0)continue;const B=V[D.id];for(const z in B)h(B[z].object),delete B[z];delete V[D.id]}}}function w(D){for(const F in n){const U=n[F],L=D.isInstancedMesh===!0?D.id:0,V=U[L];if(V!==void 0){for(const B in V){const z=V[B];for(const nt in z)h(z[nt].object),delete z[nt];delete V[B]}delete U[L],Object.keys(U).length===0&&delete n[F]}}}function P(){C(),o=!0,r!==s&&(r=s,c(r.object))}function C(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:P,resetDefaultState:C,dispose:T,releaseStatesOfGeometry:b,releaseStatesOfObject:w,releaseStatesOfProgram:g,initAttributes:M,enableAttribute:p,disableUnusedAttributes:x}}function Um(i,t,e){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),e.update(c,n,1)}function o(l,c,h){h!==0&&(i.drawArraysInstanced(n,l,c,h),e.update(c,n,h))}function a(l,c,h){if(h===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let d=0;for(let f=0;f<h;f++)d+=c[f];e.update(d,n,1)}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function Fm(i,t,e,n){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){const g=t.get("EXT_texture_filter_anisotropic");s=i.getParameter(g.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(g){return!(g!==Pn&&n.convert(g)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(g){const w=g===In&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(g!==mn&&g!==Cn&&!w&&n.convert(g)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function l(g){if(g==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";g="mediump"}return g==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp";const h=l(c);h!==c&&(Ot("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const u=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control"),d=e.logarithmicDepthBuffer===!0&&u===!1;e.reversedDepthBuffer===!0&&u===!1&&Ot("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer."),e.logarithmicDepthBuffer===!0&&u===!0&&Ot("WebGLRenderer: Logarithmic depth buffer is ignored when reversed depth buffer is enabled.");const f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),M=i.getParameter(i.MAX_TEXTURE_SIZE),p=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),m=i.getParameter(i.MAX_VERTEX_ATTRIBS),x=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),y=i.getParameter(i.MAX_VARYING_VECTORS),v=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),T=i.getParameter(i.MAX_SAMPLES),b=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:u,maxTextures:f,maxVertexTextures:_,maxTextureSize:M,maxCubemapSize:p,maxAttributes:m,maxVertexUniforms:x,maxVaryings:y,maxFragmentUniforms:v,maxSamples:T,samples:b}}function Om(i){const t=this;let e=null,n=0,s=!1,r=!1;const o=new Hn,a=new Bt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){const f=u.length!==0||d||n!==0||s;return s=d,n=u.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){e=h(u,d,0)},this.setState=function(u,d,f){const _=u.clippingPlanes,M=u.clipIntersection,p=u.clipShadows,m=i.get(u);if(!s||_===null||_.length===0||r&&!p)r?h(null):c();else{const x=r?0:n,y=x*4;let v=m.clippingState||null;l.value=v,v=h(_,d,y,f);for(let T=0;T!==y;++T)v[T]=e[T];m.clippingState=v,this.numIntersection=M?this.numPlanes:0,this.numPlanes+=x}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(u,d,f,_){const M=u!==null?u.length:0;let p=null;if(M!==0){if(p=l.value,_!==!0||p===null){const m=f+M*4,x=d.matrixWorldInverse;a.getNormalMatrix(x),(p===null||p.length<m)&&(p=new Float32Array(m));for(let y=0,v=f;y!==M;++y,v+=4)o.copy(u[y]).applyMatrix4(x,a),o.normal.toArray(p,v),p[v+3]=o.constant}l.value=p,l.needsUpdate=!0}return t.numPlanes=M,t.numIntersection=0,p}}class Xa extends Ln{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},s=[n,n,n,n,n,n];this.texture=new eh(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new ln(5,5,5),r=new bn({name:"CubemapFromEquirect",uniforms:es(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Je,blending:Zi});r.uniforms.tEquirect.value=e;const o=new mt(s,r),a=e.minFilter;return e.minFilter===ri&&(e.minFilter=cn),new ga(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e=!0,n=!0,s=!0){const r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,n,s);t.setRenderTarget(r)}}const Ql=256,zm=3,Bm=20,Mh=256,Sh=16,Gm=3,km=new R,Hm=new wt;class Dr{constructor(t){this._renderer=t,this._cubeSize=0,this._sourceTarget=null,this._cubeCamera=new ga(1,10,null),this._boxMesh=new mt(new ln(5,5,5),null),this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null,this._integrationMaterial=null}fromScene(t,e=0,n=.1,s=100,r={}){const{size:o=256,position:a=km}=r,l=this._renderer;this._setSize(o);const c=this._allocateTarget(),h=this._getSourceTarget(!0);e>0&&(h.texture.mipmapsAutoUpdate=!1);const u=l.autoClear,d=l.autoClearColor,f=l.autoClearDepth,_=l.autoClearStencil,M=t.background;l.autoClear=!0,l.autoClearColor=!0,l.autoClearDepth=!0,l.autoClearStencil=!0,M===null&&(t.background=l.getClearColor(Hm));const p=new ga(n,s,h);return p.position.copy(a),p.update(l,t),l.autoClear=u,l.autoClearColor=d,l.autoClearDepth=f,l.autoClearStencil=_,t.background=M,e>0&&(h.texture.mipmapsAutoUpdate=!0,this._blur(c,e)),this._applyPMREM(c),c}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=ec(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=tc(),this._compileMaterial(this._equirectMaterial))}dispose(){this._sourceTarget!==null&&this._sourceTarget.dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._integrationMaterial!==null&&this._integrationMaterial.dispose(),this._boxMesh.geometry.dispose()}static lodToRoughness(t,e){return e>0?1-Math.sqrt(1-t/e):0}_setSize(t){this._cubeSize=Math.max(Ql,Yc(t))}_fromTexture(t,e){t.mapping===Ji||t.mapping===ws?this._setSize(t.image.length===0?Ql:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4);const n=e||this._allocateTarget();return this._textureToCubemap(t),this._applyPMREM(n),n}_allocateTarget(){const t=this._cubeSize,e=jl(t,!1,!1),n=Math.log2(t)-zm;for(let s=0;s<=n;s++)e.texture.mipmaps.push({width:t>>s,height:t>>s});return e.texture.name="PMREM",e.texture.isPMREMTexture=!0,e}_getSourceTarget(t=!1){const e=this._cubeSize,n=this._sourceTarget;return(n===null||n.width!==e||t&&n.depthBuffer===!1)&&(n!==null&&n.dispose(),this._sourceTarget=jl(e,!0,t)),this._sourceTarget}_compileMaterial(t){this._boxMesh.material=t,this._renderer.compile(this._boxMesh,this._cubeCamera.children[0])}_renderCube(t,e,n){const s=this._boxMesh,r=this._cubeCamera;s.material=n,r.renderTarget=t,r.activeMipmapLevel=e;const o=t.width>>e;t.viewport.set(0,0,o,o),r.update(this._renderer,s),t.viewport.set(0,0,t.width,t.height)}_textureToCubemap(t){let e;t.mapping===Ji||t.mapping===ws?(this._cubemapMaterial===null&&(this._cubemapMaterial=ec()),e=this._cubemapMaterial,e.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):(this._equirectMaterial===null&&(this._equirectMaterial=tc()),e=this._equirectMaterial),e.uniforms.envMap.value=t,this._renderCube(this._getSourceTarget(),0,e)}_applyPMREM(t){this._ggxMaterial===null&&(this._ggxMaterial=Vm(),this._integrationMaterial=Wm());const e=this._cubeSize,n=t.texture.mipmaps.length-1,s=this._ggxMaterial.uniforms;s.envMap.value=this._sourceTarget.texture;const r=this._integrationMaterial.uniforms;r.envMap.value=this._sourceTarget.texture,r.sourceLod.value=Math.log2(e/Sh);for(let o=0;o<=n;o++){const a=Dr.lodToRoughness(o,n);if(o>n-Gm)r.roughness.value=a,this._renderCube(t,o,this._integrationMaterial);else{const l=a>0?Math.log2(e)+.5*Math.log2(6/(Mh*Math.pow(a,4)))+.5:0;s.roughness.value=a,s.lodBias.value=l,this._renderCube(t,o,this._ggxMaterial)}}}_blur(t,e){this._blurMaterial===null&&(this._blurMaterial=Xm());const n=this._blurMaterial,s=n.uniforms,r=this._sourceTarget;s.sigma.value=Math.min(e,Math.PI)/Math.SQRT2,s.envMap.value=r.texture,this._renderCube(t,0,n),s.envMap.value=t.texture,this._renderCube(r,0,n)}}function jl(i,t,e){return new Xa(i,{minFilter:ri,generateMipmaps:t,type:In,colorSpace:br,depthBuffer:e})}function Ns(i,t,e){return new bn({name:i,uniforms:t,vertexShader:Wt.cube_vert,fragmentShader:e,side:Je,blending:Zi,depthTest:!1,depthWrite:!1})}function Vm(){return Ns("PMREMGGXConvolution",{envMap:{value:null},roughness:{value:0},lodBias:{value:0}},`

		#define GGX_SAMPLES ${Mh}u

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float lodBias;

		#include <common>

		// Van der Corput radical inverse
		float radicalInverse_VdC( uint bits ) {

			bits = ( bits << 16u ) | ( bits >> 16u );
			bits = ( ( bits & 0x55555555u ) << 1u ) | ( ( bits & 0xAAAAAAAAu ) >> 1u );
			bits = ( ( bits & 0x33333333u ) << 2u ) | ( ( bits & 0xCCCCCCCCu ) >> 2u );
			bits = ( ( bits & 0x0F0F0F0Fu ) << 4u ) | ( ( bits & 0xF0F0F0F0u ) >> 4u );
			bits = ( ( bits & 0x00FF00FFu ) << 8u ) | ( ( bits & 0xFF00FF00u ) >> 8u );
			return float( bits ) * 2.3283064365386963e-10; // / 0x100000000

		}

		// Hammersley sequence
		vec2 hammersley( uint i, uint N ) {

			return vec2( float( i ) / float( N ), radicalInverse_VdC( i ) );

		}

		void main() {

			vec3 N = normalize( vWorldDirection );

			// For very low roughness, just sample the environment directly
			if ( roughness < 0.001 ) {

				gl_FragColor = vec4( textureLod( envMap, N, 0.0 ).rgb, 1.0 );
				return;

			}

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			// Tangent space basis for VNDF sampling
			vec3 up = abs( N.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, N ) );
			vec3 bitangent = cross( N, tangent );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			for ( uint i = 0u; i < GGX_SAMPLES; i ++ ) {

				vec2 Xi = hammersley( i, GGX_SAMPLES );

				// With V = N, sample the reflected direction directly.
				float invQ = 1.0 / ( 1.0 - Xi.x + alpha2 * Xi.x );
				float NdotL = ( 1.0 - Xi.x - alpha2 * Xi.x ) * invQ;

				if ( NdotL > 0.0 ) {

					float phi = 2.0 * PI * Xi.y;
					float sinTheta = 2.0 * alpha * sqrt( Xi.x * ( 1.0 - Xi.x ) ) * invQ;
					vec3 L = N * NdotL + ( tangent * cos( phi ) + bitangent * sin( phi ) ) * sinTheta;

					// Match the source mip to the sample's solid angle. The terms
					// independent of the sample are precomputed in lodBias.
					float d = alpha2 * invQ;
					float lod = max( log2( d ) + lodBias, 0.0 );

					// Weight by NdotL for the split-sum approximation
					prefilteredColor += textureLod( envMap, L, lod ).rgb * NdotL;
					totalWeight += NdotL;

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function Wm(){return Ns("PMREMGGXIntegration",{envMap:{value:null},roughness:{value:0},sourceLod:{value:0},sourceSize:{value:Sh}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float sourceLod;
		uniform int sourceSize;

		void main() {

			vec3 N = normalize( vWorldDirection );

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			float texelSize = 2.0 / float( sourceSize );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			// Pair opposite texels: only the one in N's hemisphere contributes.
			for ( int face = 0; face < 3; face ++ ) {

				for ( int y = 0; y < sourceSize; y ++ ) {

					for ( int x = 0; x < sourceSize; x ++ ) {

						vec2 uv = ( vec2( x, y ) + 0.5 ) * texelSize - 1.0;
						vec3 texelDirection = face == 0 ? vec3( 1.0, uv ) : ( face == 1 ? vec3( uv.x, 1.0, uv.y ) : vec3( uv, 1.0 ) );

						float invDistance = inversesqrt( 1.0 + dot( uv, uv ) );
						float NdotL = dot( N, texelDirection );
						texelDirection *= NdotL < 0.0 ? - 1.0 : 1.0;
						NdotL = abs( NdotL ) * invDistance;

						// With V = N, NdotH squared is ( 1 + NdotL ) / 2. Common factors
						// in the GGX distribution and texel solid angle cancel when normalized.
						float d = 1.0 + alpha2 + ( alpha2 - 1.0 ) * NdotL;
						float weight = NdotL * invDistance * invDistance * invDistance / ( d * d );

						prefilteredColor += textureLod( envMap, texelDirection, sourceLod ).rgb * weight;
						totalWeight += weight;

					}

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function Xm(){return Ns("PMREMSphericalGaussianBlur",{envMap:{value:null},sigma:{value:0}},`

		#define SAMPLES ${Bm}
		#define GOLDEN_ANGLE 2.39996322973

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float sigma;

		#include <common>

		void main() {

			vec3 outputDirection = normalize( vWorldDirection );

			vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, outputDirection ) );
			vec3 bitangent = cross( outputDirection, tangent );

			// Truncate the kernel at three standard deviations or at the antipode.
			float thetaMax = min( 3.0 * sigma, PI );
			float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

			vec3 accumColor = vec3( 0.0 );
			float accumWeight = 0.0;

			for ( int i = 0; i < SAMPLES; i ++ ) {

				// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
				float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
				float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
				float phi = float( i ) * GOLDEN_ANGLE;

				vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
				vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

				// Correct the planar sample density to solid angle.
				float weight = sin( theta ) / theta;

				accumColor += weight * textureLod( envMap, sampleDirection, 0.0 ).rgb;
				accumWeight += weight;

			}

			gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

		}
	`)}function tc(){return Ns("PMREMEquirectangularToCubemap",{envMap:{value:null}},`

		varying vec3 vWorldDirection;

		uniform sampler2D envMap;

		#include <common>

		void main() {

			// Average four subpixel samples to preserve small, bright features.
			vec3 direction = normalize( vWorldDirection );
			vec3 dx = dFdx( direction ) * 0.25;
			vec3 dy = dFdy( direction ) * 0.25;

			vec3 color = textureLod( envMap, equirectUv( normalize( direction - dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction - dx + dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx + dy ) ), 0.0 ).rgb;
			gl_FragColor = vec4( color * 0.25, 1.0 );

		}
	`)}function ec(){return Ns("PMREMCubemapToCubemap",{envMap:{value:null},flipEnvMap:{value:-1}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float flipEnvMap;

		void main() {

			gl_FragColor = vec4( textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ).rgb, 1.0 );

		}
	`)}function Ym(i){let t=new WeakMap,e=new WeakMap,n=null;function s(d,f=!1){return d==null?null:f?o(d):r(d)}function r(d){if(d&&d.isTexture){const f=d.mapping;if(f===Xr||f===Yr)if(t.has(d)){const _=t.get(d).texture;return a(_,d.mapping)}else{const _=d.image;if(_&&_.height>0){const M=new Xa(_.height);return M.fromEquirectangularTexture(i,d),t.set(d,M),d.addEventListener("dispose",c),a(M.texture,d.mapping)}else return null}}return d}function o(d){if(d&&d.isTexture&&d.isPMREMTexture!==!0){const f=d.mapping,_=f===Xr||f===Yr,M=f===Ji||f===ws;if(_||M){let p=e.get(d);const m=p!==void 0?p.texture.pmremVersion:0;if(d.isRenderTargetTexture&&d.pmremVersion!==m)return n===null&&(n=new Dr(i)),p=_?n.fromEquirectangular(d,p):n.fromCubemap(d,p),p.texture.pmremVersion=d.pmremVersion,e.set(d,p),p.texture;if(p!==void 0)return p.texture;{const x=d.image;return _&&x&&x.height>0||M&&x&&l(x)?(n===null&&(n=new Dr(i)),p=_?n.fromEquirectangular(d):n.fromCubemap(d),p.texture.pmremVersion=d.pmremVersion,e.set(d,p),d.addEventListener("dispose",h),p.texture):null}}}return d}function a(d,f){return f===Xr?d.mapping=Ji:f===Yr&&(d.mapping=ws),d}function l(d){let f=0;const _=6;for(let M=0;M<_;M++)d[M]!==void 0&&f++;return f===_}function c(d){const f=d.target;f.removeEventListener("dispose",c);const _=t.get(f);_!==void 0&&(t.delete(f),_.dispose())}function h(d){const f=d.target;f.removeEventListener("dispose",h);const _=e.get(f);_!==void 0&&(e.delete(f),_.dispose())}function u(){t=new WeakMap,e=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:u}}function qm(i){const t={};function e(n){if(t[n]!==void 0)return t[n];const s=i.getExtension(n);return t[n]=s,s}return{has:function(n){return e(n)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(n){const s=e(n);return s===null&&vr("WebGLRenderer: "+n+" extension not supported."),s}}}function Zm(i,t,e,n){const s={},r=new WeakMap,o=new FinalizationRegistry(_=>delete s[_]);function a(_){l(_.target)}function l(_){_.index!==null&&t.remove(_.index);for(const p in _.attributes)t.remove(_.attributes[p]);_.removeEventListener("dispose",a),delete s[_.id],o.unregister(_);const M=r.get(_);M&&(t.remove(M),r.delete(_)),n.releaseStatesOfGeometry(_),_.isInstancedBufferGeometry===!0&&delete _._maxInstanceCount,e.memory.geometries--}function c(_,M){return s[M.id]!==void 0||(M.addEventListener("dispose",a),s[M.id]=new WeakRef(M),o.register(M,M.id,M),e.memory.geometries++),M}function h(_){const M=_.attributes;for(const p in M)t.update(M[p],i.ARRAY_BUFFER)}function u(_){const M=_.index,p=_.attributes.position;let m=0;if(p===void 0)return;const x=M!==null?M.array.length:p.array.length/3-1,y=p.count>=65535?$c:Jc,v=new y(Math.ceil(x/3)*6,1),T=v.array;if(M!==null){const g=M.array;m=M.version;for(let w=0,P=0;w<x;w+=3){const C=g[w+0],D=g[w+1],F=g[w+2];T[P++]=C,T[P++]=D,T[P++]=D,T[P++]=F,T[P++]=F,T[P++]=C}}else{m=p.version;for(let g=0,w=0;g<x;g+=3){const P=g+0,C=g+1,D=g+2;T[w++]=P,T[w++]=C,T[w++]=C,T[w++]=D,T[w++]=D,T[w++]=P}}v.version=m;const b=r.get(_);b&&t.remove(b),r.set(_,v)}function d(_){const M=r.get(_);if(M){const p=_.index;p!==null&&M.version<p.version&&u(_)}else u(_);return r.get(_)}function f(){for(const _ in s){const M=s[_].deref();M!==void 0&&l(M)}}return{get:c,update:h,getWireframeAttribute:d,dispose:f}}function Km(i,t,e){let n;function s(u){n=u}let r,o;function a(u){r=u.type,o=u.bytesPerElement}function l(u,d){i.drawElements(n,d,r,u*o),e.update(d,n,1)}function c(u,d,f){f!==0&&(i.drawElementsInstanced(n,d,r,u*o,f),e.update(d,n,f))}function h(u,d,f){if(f===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,d,0,r,u,0,f);let M=0;for(let p=0;p<f;p++)M+=d[p];e.update(M,n,1)}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function Jm(i){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(e.calls++,o){case i.TRIANGLES:e.triangles+=a*(r/3);break;case i.LINES:e.lines+=a*(r/2);break;case i.LINE_STRIP:e.lines+=a*(r-1);break;case i.LINE_LOOP:e.lines+=a*r;break;case i.POINTS:e.points+=a*r;break;default:Qt("WebGLInfo: Unknown draw mode:",o);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:n}}function $m(i,t,e){const n=new WeakMap,s=new xe;function r(o,a,l){const c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0;let d=n.get(a);if(d===void 0||d.count!==u){let C=function(){w.dispose(),n.delete(a),a.removeEventListener("dispose",C)};var f=C;d!==void 0&&d.texture.dispose();const _=a.morphAttributes.position!==void 0,M=a.morphAttributes.normal!==void 0,p=a.morphAttributes.color!==void 0,m=a.morphAttributes.position||[],x=a.morphAttributes.normal||[],y=a.morphAttributes.color||[];let v=0;_===!0&&(v=1),M===!0&&(v=2),p===!0&&(v=3);let T=a.attributes.position.count*v,b=1;T>t.maxTextureSize&&(b=Math.ceil(T/t.maxTextureSize),T=t.maxTextureSize);const g=new Float32Array(T*b*4*u),w=new qc(g,T,b,u);w.type=Cn,w.needsUpdate=!0;const P=v*4;for(let D=0;D<u;D++){const F=m[D],U=x[D],L=y[D],V=T*b*4*D;for(let B=0;B<F.count;B++){const z=B*P;_===!0&&(s.fromBufferAttribute(F,B),g[V+z+0]=s.x,g[V+z+1]=s.y,g[V+z+2]=s.z,g[V+z+3]=0),M===!0&&(s.fromBufferAttribute(U,B),g[V+z+4]=s.x,g[V+z+5]=s.y,g[V+z+6]=s.z,g[V+z+7]=0),p===!0&&(s.fromBufferAttribute(L,B),g[V+z+8]=s.x,g[V+z+9]=s.y,g[V+z+10]=s.z,g[V+z+11]=L.itemSize===4?s.w:1)}}d={count:u,texture:w,size:new ot(T,b)},n.set(a,d),a.addEventListener("dispose",C)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,e);else{let _=0;for(let p=0;p<c.length;p++)_+=c[p];const M=a.morphTargetsRelative?1:1-_;l.getUniforms().setValue(i,"morphTargetBaseInfluence",M),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",d.texture,e),l.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:r}}function Qm(i,t,e,n,s){let r=new WeakMap;function o(c){const h=s.render.frame,u=c.geometry,d=t.get(c,u);if(r.get(d)!==h&&(t.update(d),r.set(d,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(e.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&e.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){const f=c.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return d}function a(){r=new WeakMap}function l(c){const h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),e.remove(h.instanceMatrix),h.instanceColor!==null&&e.remove(h.instanceColor)}return{update:o,dispose:a}}const jm={[Ac]:"LINEAR_TONE_MAPPING",[Rc]:"REINHARD_TONE_MAPPING",[Cc]:"CINEON_TONE_MAPPING",[wa]:"ACES_FILMIC_TONE_MAPPING",[Lc]:"AGX_TONE_MAPPING",[Dc]:"NEUTRAL_TONE_MAPPING",[Pc]:"CUSTOM_TONE_MAPPING"};function t0(i,t,e,n,s,r){const o=new Ln(t,e,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1});let a=null,l=null,c=null;const h=new Me;h.setAttribute("position",new Ht([-1,3,0,-1,-1,0,3,-1,0],3)),h.setAttribute("uv",new Ht([0,2,0,0,2,0],2));const u=new Hd({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),d=new mt(h,u),f=new gh(-1,1,1,-1,0,1);let _=null,M=null,p=!1,m,x=null,y=[],v=!1;this.setSize=function(T,b){o.setSize(T,b),a!==null&&a.setSize(T,b),l!==null&&l.setSize(T,b);for(let g=0;g<y.length;g++){const w=y[g];w.setSize&&w.setSize(T,b)}},this.setEffects=function(T){y=T,v=y.length>0&&y[0].isRenderPass===!0;const b=o.width,g=o.height;y.length>0&&a===null&&(a=new Ln(b,g,{type:In,depthBuffer:!1,stencilBuffer:!1}),l=new Ln(b,g,{type:In,depthBuffer:!1,stencilBuffer:!1}));const w=s===!0&&y.some(P=>P.needsDepthTexture===!0);w!==(o.depthTexture!==null)&&(w===!0&&c===null&&(c=new Qi(b,g),r===!0&&(c.format=oi,c.type=$i)),o.dispose(),o.depthTexture=w?c:null,o.resolveDepthBuffer=w,o.storeMultisampledDepthBuffer=w);for(let P=0;P<y.length;P++){const C=y[P];C.setSize&&C.setSize(b,g),w&&C.needsDepthTexture===!0&&C.setDepthTexture&&C.setDepthTexture(c)}},this.begin=function(T,b){if(p||T.toneMapping===Xn&&y.length===0)return!1;if(x=b,b!==null){const g=b.width,w=b.height;(o.width!==g||o.height!==w)&&this.setSize(g,w)}return v===!1&&T.setRenderTarget(o),m=T.toneMapping,T.toneMapping=Xn,!0},this.hasRenderPass=function(){return v},this.end=function(T,b){T.toneMapping=m,p=!0;let g=o,w=a;for(let P=0;P<y.length;P++){const C=y[P];C.enabled!==!1&&(C.render(T,w,g,b),C.needsSwap!==!1&&(g=w,w=w===a?l:a))}if(_!==T.outputColorSpace||M!==T.toneMapping){_=T.outputColorSpace,M=T.toneMapping,u.defines={},Kt.getTransfer(_)===re&&(u.defines.SRGB_TRANSFER="");const P=jm[M];P&&(u.defines[P]=""),u.needsUpdate=!0}u.uniforms.tDiffuse.value=g.texture,T.setRenderTarget(x),T.render(d,f),x=null,p=!1},this.isCompositing=function(){return p},this.dispose=function(){o.dispose(),a!==null&&a.dispose(),l!==null&&l.dispose(),h.dispose(),u.dispose()}}const yh=new $e,wh=new Qi(1,1),Eh=new nh(1),bh=new qc,Th=new Hu,Ah=new eh,nc=[],ic=[],sc=new Float32Array(16),rc=new Float32Array(9),oc=new Float32Array(4);function ns(i,t,e){const n=i[0];if(n<=0||n>0)return i;const s=t*e;let r=nc[s];if(r===void 0&&(r=new Float32Array(s),nc[s]=r),t!==0){n.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,i[o].toArray(r,a)}return r}function Ne(i,t){if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function Ue(i,t){for(let e=0,n=t.length;e<n;e++)i[e]=t[e]}function kr(i,t){let e=ic[t];e===void 0&&(e=new Int32Array(t),ic[t]=e);for(let n=0;n!==t;++n)e[n]=i.allocateTextureUnit();return e}function e0(i,t){const e=this.cache;e[0]!==t&&(i.uniform1f(this.addr,t),e[0]=t)}function n0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ne(e,t))return;i.uniform2fv(this.addr,t),Ue(e,t)}}function i0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(i.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Ne(e,t))return;i.uniform3fv(this.addr,t),Ue(e,t)}}function s0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ne(e,t))return;i.uniform4fv(this.addr,t),Ue(e,t)}}function r0(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ne(e,t))return;i.uniformMatrix2fv(this.addr,!1,t),Ue(e,t)}else{if(Ne(e,n))return;oc.set(n),i.uniformMatrix2fv(this.addr,!1,oc),Ue(e,n)}}function o0(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ne(e,t))return;i.uniformMatrix3fv(this.addr,!1,t),Ue(e,t)}else{if(Ne(e,n))return;rc.set(n),i.uniformMatrix3fv(this.addr,!1,rc),Ue(e,n)}}function a0(i,t){const e=this.cache,n=t.elements;if(n===void 0){if(Ne(e,t))return;i.uniformMatrix4fv(this.addr,!1,t),Ue(e,t)}else{if(Ne(e,n))return;sc.set(n),i.uniformMatrix4fv(this.addr,!1,sc),Ue(e,n)}}function l0(i,t){const e=this.cache;e[0]!==t&&(i.uniform1i(this.addr,t),e[0]=t)}function c0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ne(e,t))return;i.uniform2iv(this.addr,t),Ue(e,t)}}function h0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ne(e,t))return;i.uniform3iv(this.addr,t),Ue(e,t)}}function u0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ne(e,t))return;i.uniform4iv(this.addr,t),Ue(e,t)}}function d0(i,t){const e=this.cache;e[0]!==t&&(i.uniform1ui(this.addr,t),e[0]=t)}function f0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(i.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Ne(e,t))return;i.uniform2uiv(this.addr,t),Ue(e,t)}}function p0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(i.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Ne(e,t))return;i.uniform3uiv(this.addr,t),Ue(e,t)}}function m0(i,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(i.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Ne(e,t))return;i.uniform4uiv(this.addr,t),Ue(e,t)}}function Hr(i){return i.version===0&&(i.compareFunction=Vc,i.needsUpdate=!0),i}function g0(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?r=Hr(wh):r=yh,e.setTexture2D(t||r,s)}function _0(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture3D(t||Th,s)}function x0(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_CUBE_SHADOW?r=Hr(Eh):r=Ah,e.setTextureCube(t||r,s)}function v0(i,t,e){const n=this.cache,s=e.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),e.setTexture2DArray(t||bh,s)}function M0(i){switch(i){case 5126:return e0;case 35664:return n0;case 35665:return i0;case 35666:return s0;case 35674:return r0;case 35675:return o0;case 35676:return a0;case 5124:case 35670:return l0;case 35667:case 35671:return c0;case 35668:case 35672:return h0;case 35669:case 35673:return u0;case 5125:return d0;case 36294:return f0;case 36295:return p0;case 36296:return m0;case 35678:case 36198:case 36298:case 36306:case 35682:return g0;case 35679:case 36299:case 36307:return _0;case 35680:case 36300:case 36308:case 36293:return x0;case 36289:case 36303:case 36311:case 36292:return v0}}function S0(i,t){i.uniform1fv(this.addr,t)}function y0(i,t){const e=ns(t,this.size,2);i.uniform2fv(this.addr,e)}function w0(i,t){const e=ns(t,this.size,3);i.uniform3fv(this.addr,e)}function E0(i,t){const e=ns(t,this.size,4);i.uniform4fv(this.addr,e)}function b0(i,t){const e=ns(t,this.size,4);i.uniformMatrix2fv(this.addr,!1,e)}function T0(i,t){const e=ns(t,this.size,9);i.uniformMatrix3fv(this.addr,!1,e)}function A0(i,t){const e=ns(t,this.size,16);i.uniformMatrix4fv(this.addr,!1,e)}function R0(i,t){i.uniform1iv(this.addr,t)}function C0(i,t){i.uniform2iv(this.addr,t)}function P0(i,t){i.uniform3iv(this.addr,t)}function L0(i,t){i.uniform4iv(this.addr,t)}function D0(i,t){i.uniform1uiv(this.addr,t)}function I0(i,t){i.uniform2uiv(this.addr,t)}function N0(i,t){i.uniform3uiv(this.addr,t)}function U0(i,t){i.uniform4uiv(this.addr,t)}function F0(i,t,e){const n=this.cache,s=t.length,r=kr(e,s);Ne(n,r)||(i.uniform1iv(this.addr,r),Ue(n,r));let o;this.type===i.SAMPLER_2D_SHADOW?o=Hr(wh):o=yh;for(let a=0;a!==s;++a)e.setTexture2D(t[a]||o,r[a])}function O0(i,t,e){const n=this.cache,s=t.length,r=kr(e,s);Ne(n,r)||(i.uniform1iv(this.addr,r),Ue(n,r));for(let o=0;o!==s;++o)e.setTexture3D(t[o]||Th,r[o])}function z0(i,t,e){const n=this.cache,s=t.length,r=kr(e,s);Ne(n,r)||(i.uniform1iv(this.addr,r),Ue(n,r));let o;this.type===i.SAMPLER_CUBE_SHADOW?o=Hr(Eh):o=Ah;for(let a=0;a!==s;++a)e.setTextureCube(t[a]||o,r[a])}function B0(i,t,e){const n=this.cache,s=t.length,r=kr(e,s);Ne(n,r)||(i.uniform1iv(this.addr,r),Ue(n,r));for(let o=0;o!==s;++o)e.setTexture2DArray(t[o]||bh,r[o])}function G0(i){switch(i){case 5126:return S0;case 35664:return y0;case 35665:return w0;case 35666:return E0;case 35674:return b0;case 35675:return T0;case 35676:return A0;case 5124:case 35670:return R0;case 35667:case 35671:return C0;case 35668:case 35672:return P0;case 35669:case 35673:return L0;case 5125:return D0;case 36294:return I0;case 36295:return N0;case 36296:return U0;case 35678:case 36198:case 36298:case 36306:case 35682:return F0;case 35679:case 36299:case 36307:return O0;case 35680:case 36300:case 36308:case 36293:return z0;case 36289:case 36303:case 36311:case 36292:return B0}}class k0{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=M0(e.type)}}class H0{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=G0(e.type)}}class V0{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const s=this.seq;for(let r=0,o=s.length;r!==o;++r){const a=s[r];a.setValue(t,e[a.id],n)}}}const So=/(\w+)(\])?(\[|\.)?/g;function ac(i,t){i.seq.push(t),i.map[t.id]=t}function W0(i,t,e){const n=i.name,s=n.length;for(So.lastIndex=0;;){const r=So.exec(n),o=So.lastIndex;let a=r[1];const l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){ac(e,c===void 0?new k0(a,i,t):new H0(a,i,t));break}else{let u=e.map[a];u===void 0&&(u=new V0(a),ac(e,u)),e=u}}}class Mr{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){const a=t.getActiveUniform(e,o),l=t.getUniformLocation(e,a.name);W0(a,l,this)}const s=[],r=[];for(const o of this.seq)o.type===t.SAMPLER_2D_SHADOW||o.type===t.SAMPLER_CUBE_SHADOW||o.type===t.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(t,e,n,s){const r=this.map[e];r!==void 0&&r.setValue(t,n,s)}setOptional(t,e,n){const s=e[n];s!==void 0&&this.setValue(t,n,s)}static upload(t,e,n,s){for(let r=0,o=e.length;r!==o;++r){const a=e[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,s)}}static seqWithValue(t,e){const n=[];for(let s=0,r=t.length;s!==r;++s){const o=t[s];o.id in e&&n.push(o)}return n}}function lc(i,t,e){const n=i.createShader(t);return i.shaderSource(n,e),i.compileShader(n),n}const X0=37297;let Y0=0;function q0(i,t){const e=i.split(`
`),n=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=s;o<r;o++){const a=o+1;n.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return n.join(`
`)}const cc=new Bt;function Z0(i){Kt._getMatrix(cc,Kt.workingColorSpace,i);const t=`mat3( ${cc.elements.map(e=>e.toFixed(4))} )`;switch(Kt.getTransfer(i)){case Tr:return[t,"LinearTransferOETF"];case re:return[t,"sRGBTransferOETF"];default:return Ot("WebGLProgram: Unsupported color space: ",i),[t,"LinearTransferOETF"]}}function hc(i,t,e){const n=i.getShaderParameter(t,i.COMPILE_STATUS),r=(i.getShaderInfoLog(t)||"").trim();if(n&&r==="")return"";const o=/ERROR: 0:(\d+)/.exec(r);if(o){const a=parseInt(o[1]);return e.toUpperCase()+`

`+r+`

`+q0(i.getShaderSource(t),a)}else return r}function K0(i,t){const e=Z0(t);return[`vec4 ${i}( vec4 value ) {`,`	return ${e[1]}( vec4( ${e[0]} * value.rgb, value.a ) );`,"}"].join(`
`)}const J0={[Ac]:"Linear",[Rc]:"Reinhard",[Cc]:"Cineon",[wa]:"ACESFilmic",[Lc]:"AgX",[Dc]:"Neutral",[Pc]:"Custom"};function $0(i,t){const e=J0[t];return e===void 0?(Ot("WebGLProgram: Unsupported toneMapping:",t),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const dr=new R;function Q0(){Kt.getLuminanceCoefficients(dr);const i=dr.x.toFixed(4),t=dr.y.toFixed(4),e=dr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function j0(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(ps).join(`
`)}function tg(i){const t=[];for(const e in i){const n=i[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function eg(i,t){const e={},n=i.getProgramParameter(t,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){const r=i.getActiveAttrib(t,s),o=r.name;let a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:i.getAttribLocation(t,o),locationSize:a}}return e}function ps(i){return i!==""}function uc(i,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows).replace(/NUM_LIGHT_PROBE_GRIDS/g,t.numLightProbeGrids)}function dc(i,t){return i.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const ng=/^[ \t]*#include +<([\w\d./]+)>/gm;function _a(i){return i.replace(ng,ig)}function ig(i,t){const e=Wt[t];if(e===void 0)throw new Error("THREE.WebGLProgram: Can not resolve #include <"+t+">");return _a(e)}const sg=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function fc(i){return i.replace(sg,rg)}function rg(i,t,e,n){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function pc(i){let t=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?t+=`
#define HIGH_PRECISION`:i.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}const og={[gs]:"SHADOWMAP_TYPE_PCF",[ds]:"SHADOWMAP_TYPE_VSM"};function ag(i){return og[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const lg={[ws]:"ENVMAP_MODE_REFRACTION"};function cg(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":lg[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const hg={[Tc]:"ENVMAP_BLENDING_MULTIPLY",[au]:"ENVMAP_BLENDING_MIX",[lu]:"ENVMAP_BLENDING_ADD"};function ug(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":hg[i.combine]||"ENVMAP_BLENDING_NONE"}function dg(i,t,e,n){const s=i.getContext(),r=e.defines;let o=e.vertexShader,a=e.fragmentShader;const l=ag(e),c=e.envMapPMREM===!0?"ENVMAP_TYPE_PMREM":"ENVMAP_TYPE_CUBE",h=cg(e),u=ug(e),d=j0(e),f=tg(r),_=s.createProgram();let M,p,m=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(M=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,f].filter(ps).join(`
`),M.length>0&&(M+=`
`),p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,f].filter(ps).join(`
`),p.length>0&&(p+=`
`)):(M=[pc(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,f,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.diffuseRoughnessMapUv?"#define DIFFUSE_ROUGHNESSMAP_UV "+e.diffuseRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexNormals?"#define HAS_NORMAL":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(ps).join(`
`),p=[pc(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,f,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+u:"",e.envMapPMREM?"#define ENVMAP_MAX_LOD "+e.envMapMaxLod+".0":"",e.envMapPMREM?"#define ENVMAP_SIZE "+e.envMapSize+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.diffuseRoughness?"#define USE_DIFFUSE_ROUGHNESS":"",e.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.retroreflection?"#define USE_RETROREFLECTION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas||e.batchingColor?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==Xn?"#define TONE_MAPPING":"",e.toneMapping!==Xn?Wt.tonemapping_pars_fragment:"",e.toneMapping!==Xn?$0("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Wt.colorspace_pars_fragment,K0("linearToOutputTexel",e.outputColorSpace),Q0(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(ps).join(`
`)),o=_a(o),o=uc(o,e),o=dc(o,e),a=_a(a),a=uc(a,e),a=dc(a,e),o=fc(o),a=fc(a),e.isRawShaderMaterial!==!0&&(m=`#version 300 es
`,M=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+M,p=["#define varying in",e.glslVersion===pl?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===pl?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const x=m+M+o,y=m+p+a,v=lc(s,s.VERTEX_SHADER,x),T=lc(s,s.FRAGMENT_SHADER,y);s.attachShader(_,v),s.attachShader(_,T),e.index0AttributeName!==void 0?s.bindAttribLocation(_,0,e.index0AttributeName):e.hasPositionAttribute===!0&&s.bindAttribLocation(_,0,"position"),s.linkProgram(_);function b(C){if(i.debug.checkShaderErrors){const D=s.getProgramInfoLog(_)||"",F=s.getShaderInfoLog(v)||"",U=s.getShaderInfoLog(T)||"",L=D.trim(),V=F.trim(),B=U.trim();let z=!0,nt=!0;if(s.getProgramParameter(_,s.LINK_STATUS)===!1)if(z=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,_,v,T);else{const H=hc(s,v,"vertex"),Q=hc(s,T,"fragment");Qt("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(_,s.VALIDATE_STATUS)+`

Material Name: `+C.name+`
Material Type: `+C.type+`

Program Info Log: `+L+`
`+H+`
`+Q)}else L!==""?Ot("WebGLProgram: Program Info Log:",L):(V===""||B==="")&&(nt=!1);nt&&(C.diagnostics={runnable:z,programLog:L,vertexShader:{log:V,prefix:M},fragmentShader:{log:B,prefix:p}})}s.deleteShader(v),s.deleteShader(T),g=new Mr(s,_),w=eg(s,_)}let g;this.getUniforms=function(){return g===void 0&&b(this),g};let w;this.getAttributes=function(){return w===void 0&&b(this),w};let P=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return P===!1&&(P=s.getProgramParameter(_,X0)),P},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(_),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=Y0++,this.cacheKey=t,this.usedTimes=1,this.program=_,this.vertexShader=v,this.fragmentShader=T,this}let fg=0;class pg{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t,e,n){const s=this._getShaderCacheForMaterial(t);return s.has(e)===!1&&(s.add(e),e.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderStage(t){return this._getShaderStage(t.vertexShader)}getFragmentShaderStage(t){return this._getShaderStage(t.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new mg(t),e.set(t,n)),n}}class mg{constructor(t){this.id=fg++,this.code=t,this.usedTimes=0}}function gg(i){return i===wi||i===wr||i===Er}function _g(i,t,e,n,s,r){const o=new Zc,a=new pg,l=new Set,c=[],h=new Map,u=n.logarithmicDepthBuffer,d={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function f(g){return l.add(g),g===0?"uv":`uv${g}`}function _(g,w,P,C,D,F){const U=C.fog,L=D.geometry,V=g.isMeshStandardMaterial||g.isMeshLambertMaterial||g.isMeshPhongMaterial?C.environment:null,B=g.isMeshStandardMaterial||g.isMeshLambertMaterial&&!g.envMap||g.isMeshPhongMaterial&&!g.envMap,z=t.get(g.envMap||V,B),nt=d[g.type];let H=n.precision;g.precision!==null&&(H=n.getMaxPrecision(g.precision),H!==g.precision&&Ot("WebGLProgram.getParameters:",g.precision,"not supported, using",H,"instead."));const Q=L.morphAttributes.position||L.morphAttributes.normal||L.morphAttributes.color,it=Q!==void 0?Q.length:0;let _t=0;L.morphAttributes.position!==void 0&&(_t=1),L.morphAttributes.normal!==void 0&&(_t=2),L.morphAttributes.color!==void 0&&(_t=3);let bt,K,lt,St;if(nt){const ht=Rn[nt];bt=ht.vertexShader,K=ht.fragmentShader}else{bt=g.vertexShader,K=g.fragmentShader;const ht=a.getVertexShaderStage(g),Ut=a.getFragmentShaderStage(g);a.update(g,ht,Ut),lt=ht.id,St=Ut.id}const Tt=i.getRenderTarget(),gt=i.state.buffers.depth.getReversed(),Ft=D.isInstancedMesh===!0,oe=D.isBatchedMesh===!0,Pt=!!g.map,zt=!!g.matcap,Yt=!!z,kt=Yt&&z.isPMREMTexture===!0,me=!!g.aoMap,ae=!!g.lightMap,we=!!g.bumpMap&&g.wireframe===!1,ie=!!g.normalMap,Be=!!g.displacementMap,de=!!g.emissiveMap,Re=!!g.metalnessMap,Ce=!!g.roughnessMap,fe=g.anisotropy>0,k=g.clearcoat>0,ue=g.diffuseRoughness>0,ne=g.dispersion>0,se=g.retroreflectivity>0,xt=g.iridescence>0,ge=g.sheen>0,It=g.transmission>0,Nt=fe&&!!g.anisotropyMap,A=k&&!!g.clearcoatMap,S=k&&!!g.clearcoatNormalMap,W=k&&!!g.clearcoatRoughnessMap,at=ue&&!!g.diffuseRoughnessMap,N=xt&&!!g.iridescenceMap,J=xt&&!!g.iridescenceThicknessMap,st=ge&&!!g.sheenColorMap,X=ge&&!!g.sheenRoughnessMap,$=!!g.specularMap,dt=!!g.specularColorMap,I=!!g.specularIntensityMap,et=It&&!!g.transmissionMap,j=It&&!!g.thicknessMap,pt=!!g.gradientMap,ut=!!g.alphaMap,G=g.alphaTest>0,rt=!!g.alphaHash,ct=!!g.extensions;let tt=Xn;g.toneMapped&&(Tt===null||Tt.isXRRenderTarget===!0)&&(tt=i.toneMapping);const ft=kt?z.isCompressedCubeTexture?z.image[0].mipmaps:z.mipmaps:null,Dt={shaderID:nt,shaderType:g.type,shaderName:g.name,vertexShader:bt,fragmentShader:K,defines:g.defines,customVertexShaderID:lt,customFragmentShaderID:St,isRawShaderMaterial:g.isRawShaderMaterial===!0,glslVersion:g.glslVersion,precision:H,batching:oe,batchingColor:oe&&D._colorsTexture!==null,instancing:Ft,instancingColor:Ft&&D.instanceColor!==null,instancingMorph:Ft&&D.morphTexture!==null,outputColorSpace:Tt===null?i.outputColorSpace:Tt.isXRRenderTarget===!0?Tt.texture.colorSpace:Kt.workingColorSpace,alphaToCoverage:!!g.alphaToCoverage,map:Pt,matcap:zt,envMap:Yt,envMapMode:Yt&&z.mapping,envMapPMREM:kt,envMapMaxLod:kt?ft.length-1:null,envMapSize:kt?ft[0].width:null,aoMap:me,lightMap:ae,bumpMap:we,normalMap:ie,displacementMap:Be,emissiveMap:de,normalMapObjectSpace:ie&&g.normalMapType===uu,normalMapTangentSpace:ie&&g.normalMapType===ha,packedNormalMap:ie&&g.normalMapType===ha&&gg(g.normalMap.format),metalnessMap:Re,roughnessMap:Ce,anisotropy:fe,anisotropyMap:Nt,clearcoat:k,clearcoatMap:A,clearcoatNormalMap:S,clearcoatRoughnessMap:W,diffuseRoughness:ue,diffuseRoughnessMap:at,dispersion:ne,retroreflection:se,iridescence:xt,iridescenceMap:N,iridescenceThicknessMap:J,sheen:ge,sheenColorMap:st,sheenRoughnessMap:X,specularMap:$,specularColorMap:dt,specularIntensityMap:I,transmission:It,transmissionMap:et,thicknessMap:j,gradientMap:pt,opaque:g.transparent===!1&&g.blending===Si&&g.alphaToCoverage===!1,alphaMap:ut,alphaTest:G,alphaHash:rt,combine:g.combine,mapUv:Pt&&f(g.map.channel),aoMapUv:me&&f(g.aoMap.channel),lightMapUv:ae&&f(g.lightMap.channel),bumpMapUv:we&&f(g.bumpMap.channel),normalMapUv:ie&&f(g.normalMap.channel),displacementMapUv:Be&&f(g.displacementMap.channel),emissiveMapUv:de&&f(g.emissiveMap.channel),metalnessMapUv:Re&&f(g.metalnessMap.channel),roughnessMapUv:Ce&&f(g.roughnessMap.channel),anisotropyMapUv:Nt&&f(g.anisotropyMap.channel),clearcoatMapUv:A&&f(g.clearcoatMap.channel),clearcoatNormalMapUv:S&&f(g.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:W&&f(g.clearcoatRoughnessMap.channel),diffuseRoughnessMapUv:at&&f(g.diffuseRoughnessMap.channel),iridescenceMapUv:N&&f(g.iridescenceMap.channel),iridescenceThicknessMapUv:J&&f(g.iridescenceThicknessMap.channel),sheenColorMapUv:st&&f(g.sheenColorMap.channel),sheenRoughnessMapUv:X&&f(g.sheenRoughnessMap.channel),specularMapUv:$&&f(g.specularMap.channel),specularColorMapUv:dt&&f(g.specularColorMap.channel),specularIntensityMapUv:I&&f(g.specularIntensityMap.channel),transmissionMapUv:et&&f(g.transmissionMap.channel),thicknessMapUv:j&&f(g.thicknessMap.channel),alphaMapUv:ut&&f(g.alphaMap.channel),vertexTangents:!!L.attributes.tangent&&(ie||fe),vertexNormals:!!L.attributes.normal,vertexColors:g.vertexColors,vertexAlphas:g.vertexColors===!0&&!!L.attributes.color&&L.attributes.color.itemSize===4,pointsUvs:D.isPoints===!0&&!!L.attributes.uv&&(Pt||ut),fog:!!U,useFog:g.fog===!0,fogExp2:!!U&&U.isFogExp2,flatShading:g.wireframe===!1&&(g.flatShading===!0||L.attributes.normal===void 0&&ie===!1&&(g.isMeshLambertMaterial||g.isMeshPhongMaterial||g.isMeshStandardMaterial||g.isMeshPhysicalMaterial)),sizeAttenuation:g.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:gt,skinning:D.isSkinnedMesh===!0,hasPositionAttribute:L.attributes.position!==void 0,morphTargets:L.morphAttributes.position!==void 0,morphNormals:L.morphAttributes.normal!==void 0,morphColors:L.morphAttributes.color!==void 0,morphTargetsCount:it,morphTextureStride:_t,numSunLights:w.sun.length,numDirLights:w.directional.length,numPointLights:w.point.length,numSpotLights:w.spot.length,numSpotLightMaps:w.spotLightMap.length,numRectAreaLights:w.rectArea.length,numHemiLights:w.hemi.length,numSunLightShadows:w.sunShadowMap.length,numDirLightShadows:w.directionalShadowMap.length,numPointLightShadows:w.pointShadowMap.length,numSpotLightShadows:w.spotShadowMap.length,numSpotLightShadowsWithMaps:w.numSpotLightShadowsWithMaps,numLightProbes:w.numLightProbes,numLightProbeGrids:F.filter(ht=>ht.texture!==null).length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:g.dithering,shadowMapEnabled:i.shadowMap.enabled&&P.length>0,shadowMapType:i.shadowMap.type,toneMapping:tt,decodeVideoTexture:Pt&&g.map.isVideoTexture===!0&&Kt.getTransfer(g.map.colorSpace)===re,decodeVideoTextureEmissive:de&&g.emissiveMap.isVideoTexture===!0&&Kt.getTransfer(g.emissiveMap.colorSpace)===re,premultipliedAlpha:g.premultipliedAlpha,doubleSided:g.side===sn,flipSided:g.side===Je,useDepthPacking:g.depthPacking>=0,depthPacking:g.depthPacking||0,index0AttributeName:g.index0AttributeName,extensionClipCullDistance:ct&&g.extensions.clipCullDistance===!0&&e.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ct&&g.extensions.multiDraw===!0||oe)&&e.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:e.has("KHR_parallel_shader_compile"),customProgramCacheKey:g.customProgramCacheKey()};return Dt.vertexUv1s=l.has(1),Dt.vertexUv2s=l.has(2),Dt.vertexUv3s=l.has(3),l.clear(),Dt}function M(g){const w=[];if(g.shaderID?w.push(g.shaderID):(w.push(g.customVertexShaderID),w.push(g.customFragmentShaderID)),g.defines!==void 0)for(const P in g.defines)w.push(P),w.push(g.defines[P]);return g.isRawShaderMaterial===!1&&(p(w,g),m(w,g),w.push(i.outputColorSpace)),w.push(g.customProgramCacheKey),w.join()}function p(g,w){g.push(w.precision),g.push(w.outputColorSpace),g.push(w.envMapMode),g.push(w.envMapPMREM),g.push(w.envMapMaxLod),g.push(w.envMapSize),g.push(w.mapUv),g.push(w.alphaMapUv),g.push(w.lightMapUv),g.push(w.aoMapUv),g.push(w.bumpMapUv),g.push(w.normalMapUv),g.push(w.displacementMapUv),g.push(w.emissiveMapUv),g.push(w.metalnessMapUv),g.push(w.roughnessMapUv),g.push(w.anisotropyMapUv),g.push(w.clearcoatMapUv),g.push(w.clearcoatNormalMapUv),g.push(w.clearcoatRoughnessMapUv),g.push(w.diffuseRoughnessMapUv),g.push(w.iridescenceMapUv),g.push(w.iridescenceThicknessMapUv),g.push(w.sheenColorMapUv),g.push(w.sheenRoughnessMapUv),g.push(w.specularMapUv),g.push(w.specularColorMapUv),g.push(w.specularIntensityMapUv),g.push(w.transmissionMapUv),g.push(w.thicknessMapUv),g.push(w.combine),g.push(w.fogExp2),g.push(w.sizeAttenuation),g.push(w.morphTargetsCount),g.push(w.numSunLights),g.push(w.numDirLights),g.push(w.numPointLights),g.push(w.numSpotLights),g.push(w.numSpotLightMaps),g.push(w.numHemiLights),g.push(w.numRectAreaLights),g.push(w.numSunLightShadows),g.push(w.numDirLightShadows),g.push(w.numPointLightShadows),g.push(w.numSpotLightShadows),g.push(w.numSpotLightShadowsWithMaps),g.push(w.numLightProbes),g.push(w.numLightProbeGrids),g.push(w.shadowMapType),g.push(w.toneMapping),g.push(w.numClippingPlanes),g.push(w.numClipIntersection),g.push(w.depthPacking)}function m(g,w){o.disableAll(),w.instancing&&o.enable(0),w.instancingColor&&o.enable(1),w.instancingMorph&&o.enable(2),w.matcap&&o.enable(3),w.envMap&&o.enable(4),w.normalMapObjectSpace&&o.enable(5),w.normalMapTangentSpace&&o.enable(6),w.clearcoat&&o.enable(7),w.iridescence&&o.enable(8),w.alphaTest&&o.enable(9),w.vertexColors&&o.enable(10),w.vertexAlphas&&o.enable(11),w.vertexUv1s&&o.enable(12),w.vertexUv2s&&o.enable(13),w.vertexUv3s&&o.enable(14),w.vertexTangents&&o.enable(15),w.anisotropy&&o.enable(16),w.alphaHash&&o.enable(17),w.batching&&o.enable(18),w.dispersion&&o.enable(19),w.retroreflection&&o.enable(24),w.diffuseRoughness&&o.enable(25),w.batchingColor&&o.enable(20),w.gradientMap&&o.enable(21),w.packedNormalMap&&o.enable(22),w.vertexNormals&&o.enable(23),g.push(o.mask),o.disableAll(),w.fog&&o.enable(0),w.useFog&&o.enable(1),w.flatShading&&o.enable(2),w.logarithmicDepthBuffer&&o.enable(3),w.reversedDepthBuffer&&o.enable(4),w.skinning&&o.enable(5),w.morphTargets&&o.enable(6),w.morphNormals&&o.enable(7),w.morphColors&&o.enable(8),w.premultipliedAlpha&&o.enable(9),w.shadowMapEnabled&&o.enable(10),w.doubleSided&&o.enable(11),w.flipSided&&o.enable(12),w.useDepthPacking&&o.enable(13),w.dithering&&o.enable(14),w.transmission&&o.enable(15),w.sheen&&o.enable(16),w.opaque&&o.enable(17),w.pointsUvs&&o.enable(18),w.decodeVideoTexture&&o.enable(19),w.decodeVideoTextureEmissive&&o.enable(20),w.alphaToCoverage&&o.enable(21),w.numLightProbeGrids>0&&o.enable(22),w.hasPositionAttribute&&o.enable(23),g.push(o.mask)}function x(g){const w=d[g.type];let P;if(w){const C=Rn[w];P=Bd.clone(C.uniforms)}else P=g.uniforms;return P}function y(g,w){let P=h.get(w);return P!==void 0?++P.usedTimes:(P=new dg(i,w,g,s),c.push(P),h.set(w,P)),P}function v(g){if(--g.usedTimes===0){const w=c.indexOf(g);c[w]=c[c.length-1],c.pop(),h.delete(g.cacheKey),g.destroy()}}function T(g){a.remove(g)}function b(){a.dispose()}return{getParameters:_,getProgramCacheKey:M,getUniforms:x,acquireProgram:y,releaseProgram:v,releaseShaderCache:T,programs:c,dispose:b}}function xg(){let i=new WeakMap;function t(o){return i.has(o)}function e(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,l){i.get(o)[a]=l}function r(){i=new WeakMap}return{has:t,get:e,remove:n,update:s,dispose:r}}function vg(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.material.id!==t.material.id?i.material.id-t.material.id:i.materialVariant!==t.materialVariant?i.materialVariant-t.materialVariant:i.z!==t.z?i.z-t.z:i.id-t.id}function mc(i,t){return i.groupOrder!==t.groupOrder?i.groupOrder-t.groupOrder:i.renderOrder!==t.renderOrder?i.renderOrder-t.renderOrder:i.z!==t.z?t.z-i.z:i.id-t.id}function gc(){const i=[];let t=0;const e=[],n=[],s=[];function r(){t=0,e.length=0,n.length=0,s.length=0}function o(d){let f=0;return d.isInstancedMesh&&(f+=2),d.isSkinnedMesh&&(f+=1),f}function a(d,f,_,M,p,m){let x=i[t];return x===void 0?(x={id:d.id,object:d,geometry:f,material:_,materialVariant:o(d),groupOrder:M,renderOrder:d.renderOrder,z:p,group:m},i[t]=x):(x.id=d.id,x.object=d,x.geometry=f,x.material=_,x.materialVariant=o(d),x.groupOrder=M,x.renderOrder=d.renderOrder,x.z=p,x.group=m),t++,x}function l(d,f,_,M,p,m,x){x.reversedDepth===!0&&(p=-p);const y=a(d,f,_,M,p,m);_.transmission>0?n.push(y):_.transparent===!0?s.push(y):e.push(y)}function c(d,f,_,M,p,m){const x=a(d,f,_,M,p,m);_.transmission>0?n.unshift(x):_.transparent===!0?s.unshift(x):e.unshift(x)}function h(d,f){e.length>1&&e.sort(d||vg),n.length>1&&n.sort(f||mc),s.length>1&&s.sort(f||mc)}function u(){for(let d=t,f=i.length;d<f;d++){const _=i[d];if(_.id===null)break;_.id=null,_.object=null,_.geometry=null,_.material=null,_.group=null}}return{opaque:e,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:u,sort:h}}function Mg(){let i=new WeakMap;function t(n,s){const r=i.get(n);let o;return r===void 0?(o=new gc,i.set(n,[o])):s>=r.length?(o=new gc,r.push(o)):o=r[s],o}function e(){i=new WeakMap}return{get:t,dispose:e}}function Sg(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={direction:new R,color:new wt};break;case"SpotLight":e={position:new R,direction:new R,color:new wt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new R,color:new wt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new R,skyColor:new wt,groundColor:new wt};break;case"RectAreaLight":e={color:new wt,position:new R,halfWidth:new R,halfHeight:new R};break}return i[t.id]=e,e}}}function yg(){const i={};return{get:function(t){if(i[t.id]!==void 0)return i[t.id];let e;switch(t.type){case"SunLight":case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ot};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ot};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ot,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[t.id]=e,e}}}let wg=0;function Eg(i,t){return(t.castShadow?2:0)-(i.castShadow?2:0)+(t.map?1:0)-(i.map?1:0)}function bg(i){const t=new Sg,e=yg(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new R);const s=new R,r=new he,o=new he;function a(c){let h=0,u=0,d=0;for(let F=0;F<9;F++)n.probe[F].set(0,0,0);let f=0,_=0,M=0,p=0,m=0,x=0,y=0,v=0,T=0,b=0,g=0,w=0,P=0,C=0;c.sort(Eg);for(let F=0,U=c.length;F<U;F++){const L=c[F],V=L.color,B=L.intensity,z=L.distance;let nt=null;if(L.shadow&&L.shadow.map&&(L.shadow.map.texture.format===wi?nt=L.shadow.map.texture:nt=L.shadow.map.depthTexture||L.shadow.map.texture),L.isAmbientLight)h+=V.r*B,u+=V.g*B,d+=V.b*B;else if(L.isLightProbe){for(let H=0;H<9;H++)n.probe[H].addScaledVector(L.sh.coefficients[H],B);C++}else if(L.isSunLight){const H=t.get(L);if(H.color.copy(L.color).multiplyScalar(L.intensity),L.castShadow){const Q=L.shadow,it=e.get(L);it.shadowIntensity=Q.intensity,it.shadowBias=Q.bias,it.shadowNormalBias=Q.normalBias,it.shadowRadius=Q.radius,it.shadowMapSize.copy(Q.mapSize).multiply(Q.getFrameExtents()),n.sunShadow[_]=it,n.sunShadowMap[_]=nt;const _t=Q.getViewportCount();for(let bt=0;bt<_t;bt++)n.sunShadowMatrix[M+bt]=Q.getMatrix(bt),n.sunShadowCascade[M+bt]=Q._cascadeData[bt];M+=_t,_++}n.sun[f]=H,f++}else if(L.isDirectionalLight){const H=t.get(L);if(H.color.copy(L.color).multiplyScalar(L.intensity),L.castShadow){const Q=L.shadow,it=e.get(L);it.shadowIntensity=Q.intensity,it.shadowBias=Q.bias,it.shadowNormalBias=Q.normalBias,it.shadowRadius=Q.radius,it.shadowMapSize=Q.mapSize,n.directionalShadow[p]=it,n.directionalShadowMap[p]=nt,n.directionalShadowMatrix[p]=L.shadow.matrix,T++}n.directional[p]=H,p++}else if(L.isSpotLight){const H=t.get(L);H.position.setFromMatrixPosition(L.matrixWorld),H.color.copy(V).multiplyScalar(B),H.distance=z,H.coneCos=Math.cos(L.angle),H.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),H.decay=L.decay,n.spot[x]=H;const Q=L.shadow;if(L.map&&(n.spotLightMap[w]=L.map,w++,Q.updateMatrices(L),L.castShadow&&P++),n.spotLightMatrix[x]=Q.matrix,L.castShadow){const it=e.get(L);it.shadowIntensity=Q.intensity,it.shadowBias=Q.bias,it.shadowNormalBias=Q.normalBias,it.shadowRadius=Q.radius,it.shadowMapSize=Q.mapSize,n.spotShadow[x]=it,n.spotShadowMap[x]=nt,g++}x++}else if(L.isRectAreaLight){const H=t.get(L);H.color.copy(V).multiplyScalar(B),H.halfWidth.set(L.width*.5,0,0),H.halfHeight.set(0,L.height*.5,0),n.rectArea[y]=H,y++}else if(L.isPointLight){const H=t.get(L);if(H.color.copy(L.color).multiplyScalar(L.intensity),H.distance=L.distance,H.decay=L.decay,L.castShadow){const Q=L.shadow,it=e.get(L);it.shadowIntensity=Q.intensity,it.shadowBias=Q.bias,it.shadowNormalBias=Q.normalBias,it.shadowRadius=Q.radius,it.shadowMapSize=Q.mapSize,it.shadowCameraNear=Q.camera.near,it.shadowCameraFar=Q.camera.far,n.pointShadow[m]=it,n.pointShadowMap[m]=nt,n.pointShadowMatrix[m]=L.shadow.matrix,b++}n.point[m]=H,m++}else if(L.isHemisphereLight){const H=t.get(L);H.skyColor.copy(L.color).multiplyScalar(B),H.groundColor.copy(L.groundColor).multiplyScalar(B),n.hemi[v]=H,v++}}y>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=yt.LTC_FLOAT_1,n.rectAreaLTC2=yt.LTC_FLOAT_2):(n.rectAreaLTC1=yt.LTC_HALF_1,n.rectAreaLTC2=yt.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=d;const D=n.hash;(D.sunLength!==f||D.directionalLength!==p||D.pointLength!==m||D.spotLength!==x||D.rectAreaLength!==y||D.hemiLength!==v||D.numSunShadows!==_||D.numDirectionalShadows!==T||D.numPointShadows!==b||D.numSpotShadows!==g||D.numSpotMaps!==w||D.numLightProbes!==C)&&(n.sun.length=f,n.directional.length=p,n.spot.length=x,n.rectArea.length=y,n.point.length=m,n.hemi.length=v,n.sunShadow.length=_,n.sunShadowMap.length=_,n.sunShadowMatrix.length=M,n.sunShadowCascade.length=M,n.directionalShadow.length=T,n.directionalShadowMap.length=T,n.directionalShadowMatrix.length=T,n.pointShadow.length=b,n.pointShadowMap.length=b,n.pointShadowMatrix.length=b,n.spotShadow.length=g,n.spotShadowMap.length=g,n.spotLightMatrix.length=g+w-P,n.spotLightMap.length=w,n.numSpotLightShadowsWithMaps=P,n.numLightProbes=C,D.sunLength=f,D.directionalLength=p,D.pointLength=m,D.spotLength=x,D.rectAreaLength=y,D.hemiLength=v,D.numSunShadows=_,D.numDirectionalShadows=T,D.numPointShadows=b,D.numSpotShadows=g,D.numSpotMaps=w,D.numLightProbes=C,n.version=wg++)}function l(c,h){let u=0,d=0,f=0,_=0,M=0,p=0;const m=h.matrixWorldInverse;for(let x=0,y=c.length;x<y;x++){const v=c[x];if(v.isSunLight){const T=n.sun[u];T.direction.setFromMatrixPosition(v.matrixWorld),T.direction.transformDirection(m),u++}else if(v.isDirectionalLight){const T=n.directional[d];T.direction.setFromMatrixPosition(v.matrixWorld),s.setFromMatrixPosition(v.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(m),d++}else if(v.isSpotLight){const T=n.spot[_];T.position.setFromMatrixPosition(v.matrixWorld),T.position.applyMatrix4(m),T.direction.setFromMatrixPosition(v.matrixWorld),s.setFromMatrixPosition(v.target.matrixWorld),T.direction.sub(s),T.direction.transformDirection(m),_++}else if(v.isRectAreaLight){const T=n.rectArea[M];T.position.setFromMatrixPosition(v.matrixWorld),T.position.applyMatrix4(m),o.identity(),r.copy(v.matrixWorld),r.premultiply(m),o.extractRotation(r),T.halfWidth.set(v.width*.5,0,0),T.halfHeight.set(0,v.height*.5,0),T.halfWidth.applyMatrix4(o),T.halfHeight.applyMatrix4(o),M++}else if(v.isPointLight){const T=n.point[f];T.position.setFromMatrixPosition(v.matrixWorld),T.position.applyMatrix4(m),f++}else if(v.isHemisphereLight){const T=n.hemi[p];T.direction.setFromMatrixPosition(v.matrixWorld),T.direction.transformDirection(m),p++}}}return{setup:a,setupView:l,state:n}}function _c(i){const t=new bg(i),e=[],n=[],s=[];function r(u){h.camera=u,e.length=0,n.length=0,s.length=0}function o(u){u.isLightProbeGrid?s.push(u):e.push(u)}function a(u){n.push(u)}function l(){t.setup(e),s.sort((u,d)=>u.priority-d.priority||u.id-d.id)}function c(u){t.setupView(e,u)}const h={lightsArray:e,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:h,setupLights:l,setupLightsView:c,pushLight:o,pushShadow:a}}function Tg(i){let t=new WeakMap;function e(s,r=0){const o=t.get(s);let a;return o===void 0?(a=new _c(i),t.set(s,[a])):r>=o.length?(a=new _c(i),o.push(a)):a=o[r],a}function n(){t=new WeakMap}return{get:e,dispose:n}}const Ag=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Rg=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Cg=[new R(1,0,0),new R(-1,0,0),new R(0,1,0),new R(0,-1,0),new R(0,0,1),new R(0,0,-1)],Pg=[new R(0,-1,0),new R(0,-1,0),new R(0,0,1),new R(0,0,-1),new R(0,-1,0),new R(0,-1,0)],xc=new he,us=new R,yo=new R;function Lg(i,t,e){let n=new Rs;const s=new ot,r=new ot,o=new xe,a=new Vd,l=new Wd,c={},h=e.maxTextureSize,u={[yi]:Je,[Je]:yi,[sn]:sn},d=new bn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ot},radius:{value:4}},vertexShader:Ag,fragmentShader:Rg}),f=d.clone();f.defines.HORIZONTAL_PASS=1;const _=new Me;_.setAttribute("position",new hn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const M=new mt(_,d),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=gs;let m=this.type;this.render=function(b,g,w){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||b.length===0)return;this.type===Hh&&(Ot("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=gs);const P=i.getRenderTarget(),C=i.getActiveCubeFace(),D=i.getActiveMipmapLevel(),F=i.state;F.setBlending(Zi),F.buffers.depth.getReversed()===!0?F.buffers.color.setClear(0,0,0,0):F.buffers.color.setClear(1,1,1,1),F.buffers.depth.setTest(!0),F.setScissorTest(!1);const U=m!==this.type;U&&g.traverse(function(L){L.material&&(Array.isArray(L.material)?L.material.forEach(V=>V.needsUpdate=!0):L.material.needsUpdate=!0)});for(let L=0,V=b.length;L<V;L++){const B=b[L],z=B.shadow;if(z===void 0){Ot("WebGLShadowMap:",B,"has no shadow.");continue}if(z.autoUpdate===!1&&z.needsUpdate===!1)continue;s.copy(z.mapSize);const nt=z.getFrameExtents();s.multiply(nt),r.copy(z.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/nt.x),s.x=r.x*nt.x,z.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/nt.y),s.y=r.y*nt.y,z.mapSize.y=r.y));const H=i.state.buffers.depth.getReversed();if(z.camera._reversedDepth=H,z.map===null||U===!0){if(z.map!==null&&(z.map.depthTexture!==null&&(z.map.depthTexture.dispose(),z.map.depthTexture=null),z.map.dispose()),this.type===ds){if(B.isPointLight){Ot("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}z.map=new Ln(s.x,s.y,{format:wi,type:In,minFilter:cn,magFilter:cn,generateMipmaps:!1}),z.map.texture.name=B.name+".shadowMap",z.map.depthTexture=new Qi(s.x,s.y,Cn),z.map.depthTexture.name=B.name+".shadowMapDepth",z.map.depthTexture.format=li,z.map.depthTexture.compareFunction=null,z.map.depthTexture.minFilter=Ve,z.map.depthTexture.magFilter=Ve}else B.isPointLight?(z.map=new Xa(s.x),z.map.depthTexture=new nh(s.x,Dn)):(z.map=new Ln(s.x,s.y),z.map.depthTexture=new Qi(s.x,s.y,Dn)),z.map.depthTexture.name=B.name+".shadowMap",z.map.depthTexture.format=li,this.type===gs?(z.map.depthTexture.compareFunction=H?Hc:kc,z.map.depthTexture.minFilter=cn,z.map.depthTexture.magFilter=cn):(z.map.depthTexture.compareFunction=null,z.map.depthTexture.minFilter=Ve,z.map.depthTexture.magFilter=Ve);z.camera.updateProjectionMatrix()}z.map.isWebGLCubeRenderTarget!==!0&&(z.map.width!==s.x||z.map.height!==s.y)&&z.map.setSize(s.x,s.y);const Q=z.map.isWebGLCubeRenderTarget?6:z.getViewportCount();B.isPointLight!==!0&&z.updateMatrices(B,w);const it=(z.camera.layers.mask&4294967294)!==0?z.camera.layers:w.layers;for(let _t=0;_t<Q;_t++){const bt=z.getCamera(_t);if(B.isPointLight){const K=z.camera,lt=z.matrix,St=B.distance||K.far;St!==K.far&&(K.far=St,K.updateProjectionMatrix()),us.setFromMatrixPosition(B.matrixWorld),K.position.copy(us),yo.copy(K.position),yo.add(Cg[_t]),K.up.copy(Pg[_t]),K.lookAt(yo),K.updateMatrixWorld(),lt.makeTranslation(-us.x,-us.y,-us.z),xc.multiplyMatrices(K.projectionMatrix,K.matrixWorldInverse),z._frustum.setFromProjectionMatrix(xc,K.coordinateSystem,K.reversedDepth)}if(z.map.isWebGLCubeRenderTarget)i.setRenderTarget(z.map,_t),i.clear();else{_t===0&&(i.setRenderTarget(z.map),i.clear());const K=z.getViewport(_t);o.set(r.x*K.x,r.y*K.y,r.x*K.z,r.y*K.w),F.viewport(o)}n=z.getFrustum(_t),v(g,w,bt,B,it,this.type)}z.isPointLightShadow!==!0&&this.type===ds&&x(z,w),z.needsUpdate=!1}m=this.type,p.needsUpdate=!1,i.setRenderTarget(P,C,D)};function x(b,g){const w=t.update(M);d.defines.VSM_SAMPLES!==b.blurSamples&&(d.defines.VSM_SAMPLES=b.blurSamples,f.defines.VSM_SAMPLES=b.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),b.mapPass===null?b.mapPass=new Ln(s.x,s.y,{format:wi,type:In}):(b.mapPass.width!==b.map.width||b.mapPass.height!==b.map.height)&&b.mapPass.setSize(b.map.width,b.map.height),d.uniforms.shadow_pass.value=b.map.depthTexture,d.uniforms.resolution.value.set(b.map.width,b.map.height),d.uniforms.radius.value=b.radius,i.setRenderTarget(b.mapPass),i.clear(),i.renderBufferDirect(g,null,w,d,M,null),f.uniforms.shadow_pass.value=b.mapPass.texture,f.uniforms.resolution.value.set(b.map.width,b.map.height),f.uniforms.radius.value=b.radius,i.setRenderTarget(b.map),i.clear(),i.renderBufferDirect(g,null,w,f,M,null)}function y(b,g,w,P){let C=null;const D=w.isPointLight===!0?b.customDistanceMaterial:b.customDepthMaterial;if(D!==void 0)C=D;else if(C=w.isPointLight===!0?l:a,i.localClippingEnabled&&g.clipShadows===!0&&Array.isArray(g.clippingPlanes)&&g.clippingPlanes.length!==0||g.displacementMap&&g.displacementScale!==0||g.alphaMap&&g.alphaTest>0||g.map&&g.alphaTest>0||g.alphaToCoverage===!0){const F=C.uuid,U=g.uuid;let L=c[F];L===void 0&&(L={},c[F]=L);let V=L[U];V===void 0&&(V=C.clone(),L[U]=V,g.addEventListener("dispose",T)),C=V}if(C.visible=g.visible,C.wireframe=g.wireframe,P===ds?C.side=g.shadowSide!==null?g.shadowSide:g.side:C.side=g.shadowSide!==null?g.shadowSide:u[g.side],C.alphaMap=g.alphaMap,C.alphaTest=g.alphaToCoverage===!0?.5:g.alphaTest,C.map=g.map,C.clipShadows=g.clipShadows,C.clippingPlanes=g.clippingPlanes,C.clipIntersection=g.clipIntersection,C.displacementMap=g.displacementMap,C.displacementScale=g.displacementScale,C.displacementBias=g.displacementBias,C.wireframeLinewidth=g.wireframeLinewidth,C.linewidth=g.linewidth,w.isPointLight===!0&&C.isMeshDistanceMaterial===!0){const F=i.properties.get(C);F.light=w}return C}function v(b,g,w,P,C,D){if(b.visible===!1)return;if(b.layers.test(C)&&(b.isMesh||b.isLine||b.isPoints)&&(b.castShadow||b.receiveShadow&&D===ds)&&(!b.frustumCulled||b.intersectsFrustum(n))){b.modelViewMatrix.multiplyMatrices(w.matrixWorldInverse,b.matrixWorld);const L=t.update(b),V=b.material;if(Array.isArray(V)){const B=L.groups;for(let z=0,nt=B.length;z<nt;z++){const H=B[z],Q=V[H.materialIndex];if(Q&&Q.visible){const it=y(b,Q,P,D);b.onBeforeShadow(i,b,g,w,L,it,H),i.renderBufferDirect(w,null,L,it,b,H),b.onAfterShadow(i,b,g,w,L,it,H)}}}else if(V.visible){const B=y(b,V,P,D);b.onBeforeShadow(i,b,g,w,L,B,null),i.renderBufferDirect(w,null,L,B,b,null),b.onAfterShadow(i,b,g,w,L,B,null)}}const U=b.children;for(let L=0,V=U.length;L<V;L++)v(U[L],g,w,P,C,D)}function T(b){b.target.removeEventListener("dispose",T);for(const w in c){const P=c[w],C=b.target.uuid;C in P&&(P[C].dispose(),delete P[C])}}}function Dg(i,t){function e(){let I=!1;const et=new xe;let j=null;const pt=new xe(0,0,0,0);return{setMask:function(ut){j!==ut&&!I&&(i.colorMask(ut,ut,ut,ut),j=ut)},setLocked:function(ut){I=ut},setClear:function(ut,G,rt,ct,tt){tt===!0&&(ut*=ct,G*=ct,rt*=ct),et.set(ut,G,rt,ct),pt.equals(et)===!1&&(i.clearColor(ut,G,rt,ct),pt.copy(et))},reset:function(){I=!1,j=null,pt.set(-1,0,0,0)}}}function n(){let I=!1,et=!1,j=null,pt=null,ut=null;return{setReversed:function(G){if(et!==G){const rt=t.get("EXT_clip_control");G?rt.clipControlEXT(rt.LOWER_LEFT_EXT,rt.ZERO_TO_ONE_EXT):rt.clipControlEXT(rt.LOWER_LEFT_EXT,rt.NEGATIVE_ONE_TO_ONE_EXT),et=G;const ct=ut;ut=null,this.setClear(ct)}},getReversed:function(){return et},setTest:function(G){G?gt(i.DEPTH_TEST):Ft(i.DEPTH_TEST)},setMask:function(G){j!==G&&!I&&(i.depthMask(G),j=G)},setFunc:function(G){if(et&&(G=Su[G]),pt!==G){switch(G){case To:i.depthFunc(i.NEVER);break;case Ao:i.depthFunc(i.ALWAYS);break;case Ro:i.depthFunc(i.LESS);break;case ys:i.depthFunc(i.LEQUAL);break;case Co:i.depthFunc(i.EQUAL);break;case Po:i.depthFunc(i.GEQUAL);break;case Lo:i.depthFunc(i.GREATER);break;case Do:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}pt=G}},setLocked:function(G){I=G},setClear:function(G){ut!==G&&(ut=G,et&&(G=1-G),i.clearDepth(G))},reset:function(){I=!1,j=null,pt=null,ut=null,et=!1}}}function s(){let I=!1,et=null,j=null,pt=null,ut=null,G=null,rt=null,ct=null,tt=null;return{setTest:function(ft){I||(ft?gt(i.STENCIL_TEST):Ft(i.STENCIL_TEST))},setMask:function(ft){et!==ft&&!I&&(i.stencilMask(ft),et=ft)},setFunc:function(ft,Dt,ht){(j!==ft||pt!==Dt||ut!==ht)&&(i.stencilFunc(ft,Dt,ht),j=ft,pt=Dt,ut=ht)},setOp:function(ft,Dt,ht){(G!==ft||rt!==Dt||ct!==ht)&&(i.stencilOp(ft,Dt,ht),G=ft,rt=Dt,ct=ht)},setLocked:function(ft){I=ft},setClear:function(ft){tt!==ft&&(i.clearStencil(ft),tt=ft)},reset:function(){I=!1,et=null,j=null,pt=null,ut=null,G=null,rt=null,ct=null,tt=null}}}const r=new e,o=new n,a=new s;let l={};const c=new WeakMap;let h={},u={},d={},f=new WeakMap,_=[],M=null,p=!1,m=null,x=null,y=null,v=null,T=null,b=null,g=null,w=new wt(0,0,0),P=0,C=!1,D=null,F=null,U=null,L=null,V=null;const B=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let z=!1,nt=0;const H=i.getParameter(i.VERSION);H.indexOf("WebGL")!==-1?(nt=parseFloat(/^WebGL (\d)/.exec(H)[1]),z=nt>=1):H.indexOf("OpenGL ES")!==-1&&(nt=parseFloat(/^OpenGL ES (\d)/.exec(H)[1]),z=nt>=2);let Q=null,it={};const _t=i.getParameter(i.SCISSOR_BOX),bt=i.getParameter(i.VIEWPORT),K=new xe().fromArray(_t),lt=new xe().fromArray(bt);function St(I,et,j,pt){const ut=new Uint8Array(4),G=i.createTexture();i.bindTexture(I,G),i.texParameteri(I,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(I,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let rt=0;rt<j;rt++)I===i.TEXTURE_3D||I===i.TEXTURE_2D_ARRAY?i.texImage3D(et,0,i.RGBA,1,1,pt,0,i.RGBA,i.UNSIGNED_BYTE,ut):i.texImage2D(et+rt,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,ut);return G}const Tt={};Tt[i.TEXTURE_2D]=St(i.TEXTURE_2D,i.TEXTURE_2D,1),Tt[i.TEXTURE_CUBE_MAP]=St(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Tt[i.TEXTURE_2D_ARRAY]=St(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Tt[i.TEXTURE_3D]=St(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),gt(i.DEPTH_TEST),o.setFunc(ys),we(!1),ie(hl),gt(i.CULL_FACE),me(Zi);function gt(I){h[I]!==!0&&(i.enable(I),h[I]=!0)}function Ft(I){h[I]!==!1&&(i.disable(I),h[I]=!1)}function oe(I,et){return d[I]!==et?(i.bindFramebuffer(I,et),d[I]=et,I===i.DRAW_FRAMEBUFFER&&(d[i.FRAMEBUFFER]=et),I===i.FRAMEBUFFER&&(d[i.DRAW_FRAMEBUFFER]=et),!0):!1}function Pt(I,et){let j=_,pt=!1;if(I){j=f.get(et),j===void 0&&(j=[],f.set(et,j));const ut=I.textures;if(j.length!==ut.length||j[0]!==i.COLOR_ATTACHMENT0){for(let G=0,rt=ut.length;G<rt;G++)j[G]=i.COLOR_ATTACHMENT0+G;j.length=ut.length,pt=!0}}else j[0]!==i.BACK&&(j[0]=i.BACK,pt=!0);pt&&i.drawBuffers(j)}function zt(I){return M!==I?(i.useProgram(I),M=I,!0):!1}const Yt={[Wi]:i.FUNC_ADD,[Wh]:i.FUNC_SUBTRACT,[Xh]:i.FUNC_REVERSE_SUBTRACT};Yt[Yh]=i.MIN,Yt[qh]=i.MAX;const kt={[Zh]:i.ZERO,[Kh]:i.ONE,[Jh]:i.SRC_COLOR,[Ec]:i.SRC_ALPHA,[nu]:i.SRC_ALPHA_SATURATE,[tu]:i.DST_COLOR,[Qh]:i.DST_ALPHA,[$h]:i.ONE_MINUS_SRC_COLOR,[bc]:i.ONE_MINUS_SRC_ALPHA,[eu]:i.ONE_MINUS_DST_COLOR,[jh]:i.ONE_MINUS_DST_ALPHA,[iu]:i.CONSTANT_COLOR,[su]:i.ONE_MINUS_CONSTANT_COLOR,[ru]:i.CONSTANT_ALPHA,[ou]:i.ONE_MINUS_CONSTANT_ALPHA};function me(I,et,j,pt,ut,G,rt,ct,tt,ft){if(I===Zi){p===!0&&(Ft(i.BLEND),p=!1);return}if(p===!1&&(gt(i.BLEND),p=!0),I!==Vh){if(I!==m||ft!==C){if((x!==Wi||T!==Wi)&&(i.blendEquation(i.FUNC_ADD),x=Wi,T=Wi),ft)switch(I){case Si:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case ul:i.blendFunc(i.ONE,i.ONE);break;case dl:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case fl:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Qt("WebGLState: Invalid blending: ",I);break}else switch(I){case Si:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case ul:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case dl:Qt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case fl:Qt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Qt("WebGLState: Invalid blending: ",I);break}y=null,v=null,b=null,g=null,w.set(0,0,0),P=0,m=I,C=ft}return}ut=ut||et,G=G||j,rt=rt||pt,(et!==x||ut!==T)&&(i.blendEquationSeparate(Yt[et],Yt[ut]),x=et,T=ut),(j!==y||pt!==v||G!==b||rt!==g)&&(i.blendFuncSeparate(kt[j],kt[pt],kt[G],kt[rt]),y=j,v=pt,b=G,g=rt),(ct.equals(w)===!1||tt!==P)&&(i.blendColor(ct.r,ct.g,ct.b,tt),w.copy(ct),P=tt),m=I,C=!1}function ae(I,et){I.side===sn?Ft(i.CULL_FACE):gt(i.CULL_FACE);let j=I.side===Je;et&&(j=!j),we(j),I.blending===Si&&I.transparent===!1?me(Zi):me(I.blending,I.blendEquation,I.blendSrc,I.blendDst,I.blendEquationAlpha,I.blendSrcAlpha,I.blendDstAlpha,I.blendColor,I.blendAlpha,I.premultipliedAlpha),o.setFunc(I.depthFunc),o.setTest(I.depthTest),o.setMask(I.depthWrite),r.setMask(I.colorWrite);const pt=I.stencilWrite;a.setTest(pt),pt&&(a.setMask(I.stencilWriteMask),a.setFunc(I.stencilFunc,I.stencilRef,I.stencilFuncMask),a.setOp(I.stencilFail,I.stencilZFail,I.stencilZPass)),de(I.polygonOffset,I.polygonOffsetFactor,I.polygonOffsetUnits),I.alphaToCoverage===!0?gt(i.SAMPLE_ALPHA_TO_COVERAGE):Ft(i.SAMPLE_ALPHA_TO_COVERAGE)}function we(I){D!==I&&(I?i.frontFace(i.CW):i.frontFace(i.CCW),D=I)}function ie(I){I!==Gh?(gt(i.CULL_FACE),I!==F&&(I===hl?i.cullFace(i.BACK):I===kh?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Ft(i.CULL_FACE),F=I}function Be(I){I!==U&&(z&&i.lineWidth(I),U=I)}function de(I,et,j){I?(gt(i.POLYGON_OFFSET_FILL),(L!==et||V!==j)&&(L=et,V=j,o.getReversed()&&(et=-et,j=-j),i.polygonOffset(et,j))):Ft(i.POLYGON_OFFSET_FILL)}function Re(I){I?gt(i.SCISSOR_TEST):Ft(i.SCISSOR_TEST)}function Ce(I){I===void 0&&(I=i.TEXTURE0+B-1),Q!==I&&(i.activeTexture(I),Q=I)}function fe(I,et,j){j===void 0&&(Q===null?j=i.TEXTURE0+B-1:j=Q);let pt=it[j];pt===void 0&&(pt={type:void 0,texture:void 0},it[j]=pt),(pt.type!==I||pt.texture!==et)&&(Q!==j&&(i.activeTexture(j),Q=j),i.bindTexture(I,et||Tt[I]),pt.type=I,pt.texture=et)}function k(){const I=it[Q];I!==void 0&&I.type!==void 0&&(i.bindTexture(I.type,null),I.type=void 0,I.texture=void 0)}function ue(){try{i.compressedTexImage2D(...arguments)}catch(I){Qt("WebGLState:",I)}}function ne(){try{i.compressedTexImage3D(...arguments)}catch(I){Qt("WebGLState:",I)}}function se(){try{i.texSubImage2D(...arguments)}catch(I){Qt("WebGLState:",I)}}function xt(){try{i.texSubImage3D(...arguments)}catch(I){Qt("WebGLState:",I)}}function ge(){try{i.compressedTexSubImage2D(...arguments)}catch(I){Qt("WebGLState:",I)}}function It(){try{i.compressedTexSubImage3D(...arguments)}catch(I){Qt("WebGLState:",I)}}function Nt(){try{i.texStorage2D(...arguments)}catch(I){Qt("WebGLState:",I)}}function A(){try{i.texStorage3D(...arguments)}catch(I){Qt("WebGLState:",I)}}function S(){try{i.texImage2D(...arguments)}catch(I){Qt("WebGLState:",I)}}function W(){try{i.texImage3D(...arguments)}catch(I){Qt("WebGLState:",I)}}function at(I){return u[I]!==void 0?u[I]:i.getParameter(I)}function N(I,et){u[I]!==et&&(i.pixelStorei(I,et),u[I]=et)}function J(I){K.equals(I)===!1&&(i.scissor(I.x,I.y,I.z,I.w),K.copy(I))}function st(I){lt.equals(I)===!1&&(i.viewport(I.x,I.y,I.z,I.w),lt.copy(I))}function X(I,et){let j=c.get(et);j===void 0&&(j=new WeakMap,c.set(et,j));let pt=j.get(I);pt===void 0&&(pt=i.getUniformBlockIndex(et,I.name),i.uniformBlockBinding(et,pt,pt),j.set(I,pt))}function $(I,et,j){const ut=c.get(et).get(I);l[ut]!==j&&(i.bindBufferBase(i.UNIFORM_BUFFER,ut,j),l[ut]=j)}function dt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},u={},Q=null,it={},d={},l={},f=new WeakMap,_=[],M=null,p=!1,m=null,x=null,y=null,v=null,T=null,b=null,g=null,w=new wt(0,0,0),P=0,C=!1,D=null,F=null,U=null,L=null,V=null,K.set(0,0,i.canvas.width,i.canvas.height),lt.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:gt,disable:Ft,bindFramebuffer:oe,drawBuffers:Pt,useProgram:zt,setBlending:me,setMaterial:ae,setFlipSided:we,setCullFace:ie,setLineWidth:Be,setPolygonOffset:de,setScissorTest:Re,activeTexture:Ce,bindTexture:fe,unbindTexture:k,compressedTexImage2D:ue,compressedTexImage3D:ne,texImage2D:S,texImage3D:W,pixelStorei:N,getParameter:at,updateUBOMapping:X,uniformBlockBinding:$,texStorage2D:Nt,texStorage3D:A,texSubImage2D:se,texSubImage3D:xt,compressedTexSubImage2D:ge,compressedTexSubImage3D:It,scissor:J,viewport:st,reset:dt}}function Ig(i,t,e,n,s,r,o){const a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ot,h=new WeakMap,u=new Set;let d;const f=new WeakMap,_=new Set,M=new FinalizationRegistry(A=>_.delete(A));let p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function m(A,S){return p?new OffscreenCanvas(A,S):Ar("canvas")}function x(A,S,W){let at=1;const N=Nt(A);if((N.width>W||N.height>W)&&(at=W/Math.max(N.width,N.height)),at<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){const J=Math.floor(at*N.width),st=Math.floor(at*N.height);d===void 0&&(d=m(J,st));const X=S?m(J,st):d;return X.width=J,X.height=st,X.getContext("2d").drawImage(A,0,0,J,st),Ot("WebGLRenderer: Texture has been resized from ("+N.width+"x"+N.height+") to ("+J+"x"+st+")."),X}else return"data"in A&&Ot("WebGLRenderer: Image in DataTexture is too big ("+N.width+"x"+N.height+")."),A;return A}function y(A){return A.generateMipmaps}function v(A){i.generateMipmap(A)}function T(A){return A.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:A.isWebGL3DRenderTarget?i.TEXTURE_3D:A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function b(A,S,W,at,N,J=!1){if(A!==null){if(i[A]!==void 0)return i[A];Ot("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let st;at&&(st=t.get("EXT_texture_norm16"),st||Ot("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let X=S;if(S===i.RED&&(W===i.FLOAT&&(X=i.R32F),W===i.HALF_FLOAT&&(X=i.R16F),W===i.UNSIGNED_BYTE&&(X=i.R8),W===i.UNSIGNED_SHORT&&st&&(X=st.R16_EXT),W===i.SHORT&&st&&(X=st.R16_SNORM_EXT)),S===i.RED_INTEGER&&(W===i.UNSIGNED_BYTE&&(X=i.R8UI),W===i.UNSIGNED_SHORT&&(X=i.R16UI),W===i.UNSIGNED_INT&&(X=i.R32UI),W===i.BYTE&&(X=i.R8I),W===i.SHORT&&(X=i.R16I),W===i.INT&&(X=i.R32I)),S===i.RG&&(W===i.FLOAT&&(X=i.RG32F),W===i.HALF_FLOAT&&(X=i.RG16F),W===i.UNSIGNED_BYTE&&(X=i.RG8),W===i.UNSIGNED_SHORT&&st&&(X=st.RG16_EXT),W===i.SHORT&&st&&(X=st.RG16_SNORM_EXT)),S===i.RG_INTEGER&&(W===i.UNSIGNED_BYTE&&(X=i.RG8UI),W===i.UNSIGNED_SHORT&&(X=i.RG16UI),W===i.UNSIGNED_INT&&(X=i.RG32UI),W===i.BYTE&&(X=i.RG8I),W===i.SHORT&&(X=i.RG16I),W===i.INT&&(X=i.RG32I)),S===i.RGB_INTEGER&&(W===i.UNSIGNED_BYTE&&(X=i.RGB8UI),W===i.UNSIGNED_SHORT&&(X=i.RGB16UI),W===i.UNSIGNED_INT&&(X=i.RGB32UI),W===i.BYTE&&(X=i.RGB8I),W===i.SHORT&&(X=i.RGB16I),W===i.INT&&(X=i.RGB32I)),S===i.RGBA_INTEGER&&(W===i.UNSIGNED_BYTE&&(X=i.RGBA8UI),W===i.UNSIGNED_SHORT&&(X=i.RGBA16UI),W===i.UNSIGNED_INT&&(X=i.RGBA32UI),W===i.BYTE&&(X=i.RGBA8I),W===i.SHORT&&(X=i.RGBA16I),W===i.INT&&(X=i.RGBA32I)),S===i.RGB&&(W===i.UNSIGNED_SHORT&&st&&(X=st.RGB16_EXT),W===i.SHORT&&st&&(X=st.RGB16_SNORM_EXT),W===i.UNSIGNED_INT_5_9_9_9_REV&&(X=i.RGB9_E5),W===i.UNSIGNED_INT_10F_11F_11F_REV&&(X=i.R11F_G11F_B10F)),S===i.RGBA){const $=J?Tr:Kt.getTransfer(N);W===i.FLOAT&&(X=i.RGBA32F),W===i.HALF_FLOAT&&(X=i.RGBA16F),W===i.UNSIGNED_BYTE&&(X=$===re?i.SRGB8_ALPHA8:i.RGBA8),W===i.UNSIGNED_SHORT&&st&&(X=st.RGBA16_EXT),W===i.SHORT&&st&&(X=st.RGBA16_SNORM_EXT),W===i.UNSIGNED_SHORT_4_4_4_4&&(X=i.RGBA4),W===i.UNSIGNED_SHORT_5_5_5_1&&(X=i.RGB5_A1)}return(X===i.R16F||X===i.R32F||X===i.RG16F||X===i.RG32F||X===i.RGBA16F||X===i.RGBA32F)&&t.get("EXT_color_buffer_float"),X}function g(A,S){let W;return A?S===null||S===Dn||S===$i?W=i.DEPTH24_STENCIL8:S===Cn?W=i.DEPTH32F_STENCIL8:S===bs&&(W=i.DEPTH24_STENCIL8,Ot("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):S===null||S===Dn||S===$i?W=i.DEPTH_COMPONENT24:S===Cn?W=i.DEPTH_COMPONENT32F:S===bs&&(W=i.DEPTH_COMPONENT16),W}function w(A,S){return y(A)===!0||A.isFramebufferTexture&&A.minFilter!==Ve&&A.minFilter!==cn?Math.log2(Math.max(S.width,S.height))+1:A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?S.mipmaps.length:1}function P(A){const S=new WeakRef(A);n.get(A).__ref=S,_.add(S),M.register(A,S,S)}function C(A){const S=n.get(A).__ref;S!==void 0&&(_.delete(S),M.unregister(S))}function D(A){U(A.target)}function F(A){L(A.target)}function U(A){A.removeEventListener("dispose",D),C(A),B(A),A.isVideoTexture&&h.delete(A),A.isHTMLTexture&&u.delete(A)}function L(A){A.removeEventListener("dispose",F),C(A),nt(A)}function V(){for(const A of _){const S=A.deref();S!==void 0&&(S.isRenderTarget===!0?L(S):U(S))}_.clear(),u.clear()}function B(A){const S=n.get(A);if(S.__webglInit===void 0)return;const W=A.source,at=f.get(W);if(at){const N=at[S.__cacheKey];N.usedTimes--,N.usedTimes===0&&z(A),Object.keys(at).length===0&&f.delete(W)}n.remove(A)}function z(A){const S=n.get(A);i.deleteTexture(S.__webglTexture);const W=A.source,at=f.get(W);delete at[S.__cacheKey],o.memory.textures--}function nt(A){const S=n.get(A);S.__depthDisposeCallback&&S.__depthDisposeCallback();const W=A.depthTexture;if(W&&W.renderTarget===A&&U(W),A.isWebGLCubeRenderTarget)for(let N=0;N<6;N++){if(Array.isArray(S.__webglFramebuffer[N]))for(let J=0;J<S.__webglFramebuffer[N].length;J++)i.deleteFramebuffer(S.__webglFramebuffer[N][J]);else i.deleteFramebuffer(S.__webglFramebuffer[N]);S.__webglDepthbuffer&&i.deleteRenderbuffer(S.__webglDepthbuffer[N])}else{if(Array.isArray(S.__webglFramebuffer))for(let N=0;N<S.__webglFramebuffer.length;N++)i.deleteFramebuffer(S.__webglFramebuffer[N]);else i.deleteFramebuffer(S.__webglFramebuffer);if(S.__webglDepthbuffer&&i.deleteRenderbuffer(S.__webglDepthbuffer),S.__webglMultisampledFramebuffer&&i.deleteFramebuffer(S.__webglMultisampledFramebuffer),S.__webglColorRenderbuffer)for(let N=0;N<S.__webglColorRenderbuffer.length;N++)S.__webglColorRenderbuffer[N]&&i.deleteRenderbuffer(S.__webglColorRenderbuffer[N]);S.__webglDepthRenderbuffer&&i.deleteRenderbuffer(S.__webglDepthRenderbuffer)}const at=A.textures;for(let N=0,J=at.length;N<J;N++){const st=n.get(at[N]);st.__webglTexture&&(i.deleteTexture(st.__webglTexture),o.memory.textures--),n.remove(at[N])}n.remove(A)}let H=0;function Q(){H=0}function it(){return H}function _t(A){H=A}function bt(){const A=H;return A>=s.maxTextures&&Ot("WebGLTextures: Trying to use "+(A+1)+" texture units while this GPU supports only "+s.maxTextures),H+=1,A}function K(A){const S=[];return S.push(A.wrapS),S.push(A.wrapT),S.push(A.wrapR||0),S.push(A.magFilter),S.push(A.minFilter),S.push(A.anisotropy),S.push(A.internalFormat),S.push(A.format),S.push(A.type),S.push(A.generateMipmaps),S.push(A.mipmapsAutoUpdate),S.push(A.premultiplyAlpha),S.push(A.flipY),S.push(A.unpackAlignment),S.push(A.colorSpace),S.join()}function lt(A,S){const W=n.get(A);if(A.isVideoTexture&&ge(A),A.isRenderTargetTexture===!1&&A.isExternalTexture!==!0&&A.version>0&&W.__version!==A.version){const at=A.image;if(at===null)Ot("WebGLRenderer: Texture marked for update but no image data found.");else if(at.complete===!1)Ot("WebGLRenderer: Texture marked for update but image is incomplete");else{ae(W,A,S);return}}else A.isExternalTexture&&(W.__webglTexture=A.sourceTexture?A.sourceTexture:null);e.bindTexture(i.TEXTURE_2D,W.__webglTexture,i.TEXTURE0+S)}function St(A,S){const W=n.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&W.__version!==A.version){ae(W,A,S);return}else A.isExternalTexture&&(W.__webglTexture=A.sourceTexture?A.sourceTexture:null);e.bindTexture(i.TEXTURE_2D_ARRAY,W.__webglTexture,i.TEXTURE0+S)}function Tt(A,S){const W=n.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&W.__version!==A.version){ae(W,A,S);return}e.bindTexture(i.TEXTURE_3D,W.__webglTexture,i.TEXTURE0+S)}function gt(A,S){const W=n.get(A);if(A.version>0&&W.__version!==A.version){we(W,A,S);return}e.bindTexture(i.TEXTURE_CUBE_MAP,W.__webglTexture,i.TEXTURE0+S)}const Ft={[Es]:i.REPEAT,[Wn]:i.CLAMP_TO_EDGE,[Io]:i.MIRRORED_REPEAT},oe={[Ve]:i.NEAREST,[cu]:i.NEAREST_MIPMAP_NEAREST,[zs]:i.NEAREST_MIPMAP_LINEAR,[cn]:i.LINEAR,[qr]:i.LINEAR_MIPMAP_NEAREST,[ri]:i.LINEAR_MIPMAP_LINEAR},Pt={[fu]:i.NEVER,[Vc]:i.ALWAYS,[pu]:i.LESS,[kc]:i.LEQUAL,[mu]:i.EQUAL,[Hc]:i.GEQUAL,[gu]:i.GREATER,[_u]:i.NOTEQUAL};function zt(A,S){if(S.type===Cn&&t.has("OES_texture_float_linear")===!1&&(S.magFilter===cn||S.magFilter===qr||S.magFilter===zs||S.magFilter===ri||S.minFilter===cn||S.minFilter===qr||S.minFilter===zs||S.minFilter===ri)&&Ot("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(A,i.TEXTURE_WRAP_S,Ft[S.wrapS]),i.texParameteri(A,i.TEXTURE_WRAP_T,Ft[S.wrapT]),(A===i.TEXTURE_3D||A===i.TEXTURE_2D_ARRAY)&&i.texParameteri(A,i.TEXTURE_WRAP_R,Ft[S.wrapR]),i.texParameteri(A,i.TEXTURE_MAG_FILTER,oe[S.magFilter]),i.texParameteri(A,i.TEXTURE_MIN_FILTER,oe[S.minFilter]),S.compareFunction&&(i.texParameteri(A,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(A,i.TEXTURE_COMPARE_FUNC,Pt[S.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(S.magFilter===Ve||S.minFilter!==zs&&S.minFilter!==ri||S.type===Cn&&t.has("OES_texture_float_linear")===!1)return;if(S.anisotropy>1||n.get(S).__currentAnisotropy){const W=t.get("EXT_texture_filter_anisotropic");i.texParameterf(A,W.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(S.anisotropy,s.getMaxAnisotropy())),n.get(S).__currentAnisotropy=S.anisotropy}}}function Yt(A,S){let W=!1;A.__webglInit===void 0&&(A.__webglInit=!0,S.addEventListener("dispose",D),P(S));const at=S.source;let N=f.get(at);N===void 0&&(N={},f.set(at,N));const J=K(S);if(J!==A.__cacheKey){N[J]===void 0&&(N[J]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,W=!0),N[J].usedTimes++;const st=N[A.__cacheKey];st!==void 0&&(N[A.__cacheKey].usedTimes--,st.usedTimes===0&&z(S)),A.__cacheKey=J,A.__webglTexture=N[J].texture}return W}function kt(A,S,W){return Math.floor(Math.floor(A/W)/S)}function me(A,S,W,at){const J=A.updateRanges;if(J.length===0)e.texSubImage2D(i.TEXTURE_2D,0,0,0,S.width,S.height,W,at,S.data);else{J.sort((I,et)=>I.start-et.start);let st=0;for(let I=1;I<J.length;I++){const et=J[st],j=J[I],pt=et.start+et.count,ut=kt(j.start,S.width,4),G=kt(et.start,S.width,4);j.start<=pt+1&&ut===G&&kt(j.start+j.count-1,S.width,4)===ut?et.count=Math.max(et.count,j.start+j.count-et.start):(++st,J[st]=j)}J.length=st+1;const X=e.getParameter(i.UNPACK_ROW_LENGTH),$=e.getParameter(i.UNPACK_SKIP_PIXELS),dt=e.getParameter(i.UNPACK_SKIP_ROWS);e.pixelStorei(i.UNPACK_ROW_LENGTH,S.width);for(let I=0,et=J.length;I<et;I++){const j=J[I],pt=Math.floor(j.start/4),ut=Math.ceil(j.count/4),G=pt%S.width,rt=Math.floor(pt/S.width),ct=ut,tt=1;e.pixelStorei(i.UNPACK_SKIP_PIXELS,G),e.pixelStorei(i.UNPACK_SKIP_ROWS,rt),e.texSubImage2D(i.TEXTURE_2D,0,G,rt,ct,tt,W,at,S.data)}A.clearUpdateRanges(),e.pixelStorei(i.UNPACK_ROW_LENGTH,X),e.pixelStorei(i.UNPACK_SKIP_PIXELS,$),e.pixelStorei(i.UNPACK_SKIP_ROWS,dt)}}function ae(A,S,W){let at=i.TEXTURE_2D;(S.isDataArrayTexture||S.isCompressedArrayTexture)&&(at=i.TEXTURE_2D_ARRAY),S.isData3DTexture&&(at=i.TEXTURE_3D);const N=Yt(A,S),J=S.source;e.bindTexture(at,A.__webglTexture,i.TEXTURE0+W);const st=n.get(J);if(J.version!==st.__version||N===!0){if(e.activeTexture(i.TEXTURE0+W),(typeof ImageBitmap<"u"&&S.image instanceof ImageBitmap)===!1){const tt=Kt.getPrimaries(Kt.workingColorSpace),ft=S.colorSpace===ii?null:Kt.getPrimaries(S.colorSpace),Dt=S.colorSpace===ii||tt===ft?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,S.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Dt)}e.pixelStorei(i.UNPACK_ALIGNMENT,S.unpackAlignment);let $=x(S.image,!1,s.maxTextureSize);$=It(S,$);const dt=r.convert(S.format,S.colorSpace),I=r.convert(S.type);let et=b(S.internalFormat,dt,I,S.normalized,S.colorSpace,S.isVideoTexture);zt(at,S);let j;const pt=S.mipmaps,ut=S.isVideoTexture!==!0,G=st.__version===void 0||N===!0,rt=J.dataReady,ct=w(S,$);if(S.isDepthTexture)et=g(S.format===oi,S.type),G&&(ut?e.texStorage2D(i.TEXTURE_2D,1,et,$.width,$.height):e.texImage2D(i.TEXTURE_2D,0,et,$.width,$.height,0,dt,I,null));else if(S.isDataTexture)if(pt.length>0){ut&&G&&e.texStorage2D(i.TEXTURE_2D,ct,et,pt[0].width,pt[0].height);for(let tt=0,ft=pt.length;tt<ft;tt++)j=pt[tt],ut?rt&&e.texSubImage2D(i.TEXTURE_2D,tt,0,0,j.width,j.height,dt,I,j.data):e.texImage2D(i.TEXTURE_2D,tt,et,j.width,j.height,0,dt,I,j.data);S.generateMipmaps=!1}else ut?(G&&e.texStorage2D(i.TEXTURE_2D,ct,et,$.width,$.height),rt&&me(S,$,dt,I)):e.texImage2D(i.TEXTURE_2D,0,et,$.width,$.height,0,dt,I,$.data);else if(S.isCompressedTexture)if(S.isCompressedArrayTexture){ut&&G&&e.texStorage3D(i.TEXTURE_2D_ARRAY,ct,et,pt[0].width,pt[0].height,$.depth);for(let tt=0,ft=pt.length;tt<ft;tt++)if(j=pt[tt],S.format!==Pn)if(dt!==null)if(ut){if(rt)if(S.layerUpdates.size>0){const Dt=$l(j.width,j.height,S.format,S.type);for(const ht of S.layerUpdates){const Ut=j.data.subarray(ht*Dt/j.data.BYTES_PER_ELEMENT,(ht+1)*Dt/j.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,tt,0,0,ht,j.width,j.height,1,dt,Ut)}}else e.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,tt,0,0,0,j.width,j.height,$.depth,dt,j.data)}else e.compressedTexImage3D(i.TEXTURE_2D_ARRAY,tt,et,j.width,j.height,$.depth,0,j.data,0,0);else Ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else ut?rt&&e.texSubImage3D(i.TEXTURE_2D_ARRAY,tt,0,0,0,j.width,j.height,$.depth,dt,I,j.data):e.texImage3D(i.TEXTURE_2D_ARRAY,tt,et,j.width,j.height,$.depth,0,dt,I,j.data);S.layerUpdates.size>0&&S.clearLayerUpdates()}else{ut&&G&&e.texStorage2D(i.TEXTURE_2D,ct,et,pt[0].width,pt[0].height);for(let tt=0,ft=pt.length;tt<ft;tt++)j=pt[tt],S.format!==Pn?dt!==null?ut?rt&&e.compressedTexSubImage2D(i.TEXTURE_2D,tt,0,0,j.width,j.height,dt,j.data):e.compressedTexImage2D(i.TEXTURE_2D,tt,et,j.width,j.height,0,j.data):Ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ut?rt&&e.texSubImage2D(i.TEXTURE_2D,tt,0,0,j.width,j.height,dt,I,j.data):e.texImage2D(i.TEXTURE_2D,tt,et,j.width,j.height,0,dt,I,j.data)}else if(S.isDataArrayTexture)if(ut){if(G&&e.texStorage3D(i.TEXTURE_2D_ARRAY,ct,et,$.width,$.height,$.depth),rt)if(S.layerUpdates.size>0){const tt=$l($.width,$.height,S.format,S.type);for(const ft of S.layerUpdates){const Dt=$.data.subarray(ft*tt/$.data.BYTES_PER_ELEMENT,(ft+1)*tt/$.data.BYTES_PER_ELEMENT);e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,ft,$.width,$.height,1,dt,I,Dt)}S.clearLayerUpdates()}else e.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,$.width,$.height,$.depth,dt,I,$.data)}else e.texImage3D(i.TEXTURE_2D_ARRAY,0,et,$.width,$.height,$.depth,0,dt,I,$.data);else if(S.isData3DTexture)ut?(G&&e.texStorage3D(i.TEXTURE_3D,ct,et,$.width,$.height,$.depth),rt&&e.texSubImage3D(i.TEXTURE_3D,0,0,0,0,$.width,$.height,$.depth,dt,I,$.data)):e.texImage3D(i.TEXTURE_3D,0,et,$.width,$.height,$.depth,0,dt,I,$.data);else if(S.isFramebufferTexture){if(G)if(ut)e.texStorage2D(i.TEXTURE_2D,ct,et,$.width,$.height);else{let tt=$.width,ft=$.height;for(let Dt=0;Dt<ct;Dt++)e.texImage2D(i.TEXTURE_2D,Dt,et,tt,ft,0,dt,I,null),tt>>=1,ft>>=1}}else if(S.isHTMLTexture){if("texElementImage2D"in i){const tt=i.canvas;if(tt.hasAttribute("layoutsubtree")||tt.setAttribute("layoutsubtree","true"),$.parentNode!==tt){tt.appendChild($),u.add(S),tt.onpaint=ft=>{const Dt=ft.changedElements;for(const ht of u)Dt.includes(ht.image)&&(ht.needsUpdate=!0)},tt.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,$);else{const Dt=i.RGBA,ht=i.RGBA,Ut=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Dt,ht,Ut,$)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(pt.length>0){if(ut&&G){const tt=Nt(pt[0]);e.texStorage2D(i.TEXTURE_2D,ct,et,tt.width,tt.height)}for(let tt=0,ft=pt.length;tt<ft;tt++)j=pt[tt],ut?rt&&e.texSubImage2D(i.TEXTURE_2D,tt,0,0,dt,I,j):e.texImage2D(i.TEXTURE_2D,tt,et,dt,I,j);S.generateMipmaps=!1}else if(ut){if(G){const tt=Nt($);e.texStorage2D(i.TEXTURE_2D,ct,et,tt.width,tt.height)}rt&&e.texSubImage2D(i.TEXTURE_2D,0,0,0,dt,I,$)}else e.texImage2D(i.TEXTURE_2D,0,et,dt,I,$);y(S)&&S.mipmapsAutoUpdate===!0&&v(at),st.__version=J.version,S.onUpdate&&S.onUpdate(S)}A.__version=S.version}function we(A,S,W){if(S.image.length!==6)return;const at=Yt(A,S),N=S.source;e.bindTexture(i.TEXTURE_CUBE_MAP,A.__webglTexture,i.TEXTURE0+W);const J=n.get(N);if(N.version!==J.__version||at===!0){e.activeTexture(i.TEXTURE0+W);const st=Kt.getPrimaries(Kt.workingColorSpace),X=S.colorSpace===ii?null:Kt.getPrimaries(S.colorSpace),$=S.colorSpace===ii||st===X?i.NONE:i.BROWSER_DEFAULT_WEBGL;e.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,S.flipY),e.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),e.pixelStorei(i.UNPACK_ALIGNMENT,S.unpackAlignment),e.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,$);const dt=S.isCompressedTexture||S.image[0].isCompressedTexture,I=S.image[0]&&S.image[0].isDataTexture,et=[];for(let ht=0;ht<6;ht++)!dt&&!I?et[ht]=x(S.image[ht],!0,s.maxCubemapSize):et[ht]=I?S.image[ht].image:S.image[ht],et[ht]=It(S,et[ht]);const j=et[0],pt=r.convert(S.format,S.colorSpace),ut=r.convert(S.type);let G=b(S.internalFormat,pt,ut,S.normalized,S.colorSpace);const rt=S.isVideoTexture!==!0,ct=J.__version===void 0||at===!0,tt=N.dataReady;let ft=w(S,j);zt(i.TEXTURE_CUBE_MAP,S);let Dt;if(S.isDepthTexture){if(G=g(S.format===oi,S.type),ct)if(rt)e.texStorage2D(i.TEXTURE_CUBE_MAP,1,G,j.width,j.height);else for(let ht=0;ht<6;ht++)e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,0,G,j.width,j.height,0,pt,ut,null)}else if(dt){rt&&ct&&e.texStorage2D(i.TEXTURE_CUBE_MAP,ft,G,j.width,j.height);for(let ht=0;ht<6;ht++){Dt=et[ht].mipmaps;for(let Ut=0;Ut<Dt.length;Ut++){const Jt=Dt[Ut];S.format!==Pn?pt!==null?rt?tt&&e.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,Ut,0,0,Jt.width,Jt.height,pt,Jt.data):e.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,Ut,G,Jt.width,Jt.height,0,Jt.data):Ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):rt?tt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,Ut,0,0,Jt.width,Jt.height,pt,ut,Jt.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,Ut,G,Jt.width,Jt.height,0,pt,ut,Jt.data)}}}else{if(Dt=S.mipmaps,rt&&ct){Dt.length>0&&ft++;const ht=Nt(et[0]);e.texStorage2D(i.TEXTURE_CUBE_MAP,ft,G,ht.width,ht.height)}for(let ht=0;ht<6;ht++)if(I){rt?tt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,0,0,0,et[ht].width,et[ht].height,pt,ut,et[ht].data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,0,G,et[ht].width,et[ht].height,0,pt,ut,et[ht].data);for(let Ut=0;Ut<Dt.length;Ut++){const Se=Dt[Ut].image[ht].image;rt?tt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,Ut+1,0,0,Se.width,Se.height,pt,ut,Se.data):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,Ut+1,G,Se.width,Se.height,0,pt,ut,Se.data)}}else{rt?tt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,0,0,0,pt,ut,et[ht]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,0,G,pt,ut,et[ht]);for(let Ut=0;Ut<Dt.length;Ut++){const Jt=Dt[Ut];rt?tt&&e.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,Ut+1,0,0,pt,ut,Jt.image[ht]):e.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ht,Ut+1,G,pt,ut,Jt.image[ht])}}}y(S)&&S.mipmapsAutoUpdate===!0&&v(i.TEXTURE_CUBE_MAP),J.__version=N.version,S.onUpdate&&S.onUpdate(S)}A.__version=S.version}function ie(A,S,W,at,N,J){const st=r.convert(W.format,W.colorSpace),X=r.convert(W.type),$=b(W.internalFormat,st,X,W.normalized,W.colorSpace),dt=n.get(S),I=n.get(W);if(I.__renderTarget=S,!dt.__hasExternalTextures){const et=Math.max(1,S.width>>J),j=Math.max(1,S.height>>J);N===i.TEXTURE_3D||N===i.TEXTURE_2D_ARRAY?e.texImage3D(N,J,$,et,j,S.depth,0,st,X,null):e.texImage2D(N,J,$,et,j,0,st,X,null)}e.bindFramebuffer(i.FRAMEBUFFER,A),xt(S)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,at,N,I.__webglTexture,0,se(S)):(N===i.TEXTURE_2D||N>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&N<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,at,N,I.__webglTexture,J),e.bindFramebuffer(i.FRAMEBUFFER,null)}function Be(A,S,W){if(i.bindRenderbuffer(i.RENDERBUFFER,A),S.depthBuffer){const at=S.depthTexture,N=at&&at.isDepthTexture?at.type:null,J=g(S.stencilBuffer,N),st=S.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;xt(S)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,se(S),J,S.width,S.height):W?i.renderbufferStorageMultisample(i.RENDERBUFFER,se(S),J,S.width,S.height):i.renderbufferStorage(i.RENDERBUFFER,J,S.width,S.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,st,i.RENDERBUFFER,A)}else{const at=S.textures;for(let N=0;N<at.length;N++){const J=at[N],st=r.convert(J.format,J.colorSpace),X=r.convert(J.type),$=b(J.internalFormat,st,X,J.normalized,J.colorSpace);xt(S)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,se(S),$,S.width,S.height):W?i.renderbufferStorageMultisample(i.RENDERBUFFER,se(S),$,S.width,S.height):i.renderbufferStorage(i.RENDERBUFFER,$,S.width,S.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function de(A,S,W){const at=S.isWebGLCubeRenderTarget===!0;if(e.bindFramebuffer(i.FRAMEBUFFER,A),!(S.depthTexture&&S.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const N=n.get(S.depthTexture);N.__renderTarget=S;const J=at?S.depthTexture.image[0]:S.depthTexture.image;(!N.__webglTexture||J.width!==S.width||J.height!==S.height)&&(J.width=S.width,J.height=S.height,S.depthTexture.needsUpdate=!0),at?gt(S.depthTexture,0):lt(S.depthTexture,0);const st=N.__webglTexture,X=se(S),$=at?i.TEXTURE_CUBE_MAP_POSITIVE_X+W:i.TEXTURE_2D,dt=S.depthTexture.format===oi?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(S.depthTexture.format===li)xt(S)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,dt,$,st,0,X):i.framebufferTexture2D(i.FRAMEBUFFER,dt,$,st,0);else if(S.depthTexture.format===oi)xt(S)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,dt,$,st,0,X):i.framebufferTexture2D(i.FRAMEBUFFER,dt,$,st,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Re(A){const S=n.get(A),W=A.isWebGLCubeRenderTarget===!0;if(S.__boundDepthTexture!==A.depthTexture){const at=A.depthTexture;if(S.__depthDisposeCallback&&S.__depthDisposeCallback(),at){const N=()=>{delete S.__boundDepthTexture,delete S.__depthDisposeCallback,at.removeEventListener("dispose",N)};at.addEventListener("dispose",N),S.__depthDisposeCallback=N}S.__boundDepthTexture=at}if(A.depthTexture&&!S.__autoAllocateDepthBuffer)if(W)for(let at=0;at<6;at++)de(S.__webglFramebuffer[at],A,at);else A.texture.mipmaps.length>0?de(S.__webglFramebuffer[0],A,0):de(S.__webglFramebuffer,A,0);else if(W){S.__webglDepthbuffer=[];for(let at=0;at<6;at++)if(e.bindFramebuffer(i.FRAMEBUFFER,S.__webglFramebuffer[at]),S.__webglDepthbuffer[at]===void 0)S.__webglDepthbuffer[at]=i.createRenderbuffer(),Be(S.__webglDepthbuffer[at],A,!1);else{const N=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,J=S.__webglDepthbuffer[at];i.bindRenderbuffer(i.RENDERBUFFER,J),i.framebufferRenderbuffer(i.FRAMEBUFFER,N,i.RENDERBUFFER,J)}}else if(A.texture.mipmaps.length>0?e.bindFramebuffer(i.FRAMEBUFFER,S.__webglFramebuffer[0]):e.bindFramebuffer(i.FRAMEBUFFER,S.__webglFramebuffer),S.__webglDepthbuffer===void 0)S.__webglDepthbuffer=i.createRenderbuffer(),Be(S.__webglDepthbuffer,A,!1);else{const N=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,J=S.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,J),i.framebufferRenderbuffer(i.FRAMEBUFFER,N,i.RENDERBUFFER,J)}e.bindFramebuffer(i.FRAMEBUFFER,null)}function Ce(A,S,W){const at=n.get(A);S!==void 0&&ie(at.__webglFramebuffer,A,A.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),W!==void 0&&Re(A)}function fe(A){const S=A.texture,W=n.get(A),at=n.get(S);A.addEventListener("dispose",F),P(A);const N=A.textures,J=A.isWebGLCubeRenderTarget===!0,st=N.length>1;if(st||(at.__webglTexture===void 0&&(at.__webglTexture=i.createTexture()),at.__version=S.version,o.memory.textures++),J){W.__webglFramebuffer=[];for(let X=0;X<6;X++)if(S.mipmaps.length>0){W.__webglFramebuffer[X]=[];for(let $=0;$<S.mipmaps.length;$++)W.__webglFramebuffer[X][$]=i.createFramebuffer()}else W.__webglFramebuffer[X]=i.createFramebuffer()}else{if(S.mipmaps.length>0){W.__webglFramebuffer=[];for(let X=0;X<S.mipmaps.length;X++)W.__webglFramebuffer[X]=i.createFramebuffer()}else W.__webglFramebuffer=i.createFramebuffer();if(st)for(let X=0,$=N.length;X<$;X++){const dt=n.get(N[X]);dt.__webglTexture===void 0&&(dt.__webglTexture=i.createTexture(),o.memory.textures++)}if(A.samples>0&&xt(A)===!1){W.__webglMultisampledFramebuffer=i.createFramebuffer(),W.__webglColorRenderbuffer=[],e.bindFramebuffer(i.FRAMEBUFFER,W.__webglMultisampledFramebuffer);for(let X=0;X<N.length;X++){const $=N[X];W.__webglColorRenderbuffer[X]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,W.__webglColorRenderbuffer[X]);const dt=r.convert($.format,$.colorSpace),I=r.convert($.type),et=b($.internalFormat,dt,I,$.normalized,$.colorSpace,A.isXRRenderTarget===!0),j=se(A);i.renderbufferStorageMultisample(i.RENDERBUFFER,j,et,A.width,A.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+X,i.RENDERBUFFER,W.__webglColorRenderbuffer[X])}i.bindRenderbuffer(i.RENDERBUFFER,null),A.depthBuffer&&(W.__webglDepthRenderbuffer=i.createRenderbuffer(),Be(W.__webglDepthRenderbuffer,A,!0)),e.bindFramebuffer(i.FRAMEBUFFER,null)}}if(J){e.bindTexture(i.TEXTURE_CUBE_MAP,at.__webglTexture),zt(i.TEXTURE_CUBE_MAP,S);for(let X=0;X<6;X++)if(S.mipmaps.length>0)for(let $=0;$<S.mipmaps.length;$++)ie(W.__webglFramebuffer[X][$],A,S,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+X,$);else ie(W.__webglFramebuffer[X],A,S,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+X,0);y(S)?v(i.TEXTURE_CUBE_MAP):S.mipmaps.length>0&&i.texParameteri(i.TEXTURE_CUBE_MAP,i.TEXTURE_MAX_LEVEL,S.mipmaps.length-1),e.unbindTexture()}else if(st){for(let X=0,$=N.length;X<$;X++){const dt=N[X],I=n.get(dt);let et=i.TEXTURE_2D;(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(et=A.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(et,I.__webglTexture),zt(et,dt),ie(W.__webglFramebuffer,A,dt,i.COLOR_ATTACHMENT0+X,et,0),y(dt)&&v(et)}e.unbindTexture()}else{let X=i.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(X=A.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),e.bindTexture(X,at.__webglTexture),zt(X,S),S.mipmaps.length>0)for(let $=0;$<S.mipmaps.length;$++)ie(W.__webglFramebuffer[$],A,S,i.COLOR_ATTACHMENT0,X,$);else ie(W.__webglFramebuffer,A,S,i.COLOR_ATTACHMENT0,X,0);y(S)?v(X):S.mipmaps.length>0&&i.texParameteri(X,i.TEXTURE_MAX_LEVEL,S.mipmaps.length-1),e.unbindTexture()}A.depthBuffer&&Re(A)}function k(A){const S=A.textures;for(let W=0,at=S.length;W<at;W++){const N=S[W];if(y(N)&&N.mipmapsAutoUpdate===!0){const J=T(A),st=n.get(N).__webglTexture;e.bindTexture(J,st),v(J),e.unbindTexture()}}}const ue=[];function ne(A){if(A.samples>0){if(xt(A)===!1){const S=A.textures,W=A.width,at=A.height;let N=i.COLOR_BUFFER_BIT;const J=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,st=n.get(A),X=S.length>1;if(X)for(let dt=0;dt<S.length;dt++)e.bindFramebuffer(i.FRAMEBUFFER,st.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+dt,i.RENDERBUFFER,null),e.bindFramebuffer(i.FRAMEBUFFER,st.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+dt,i.TEXTURE_2D,null,0);e.bindFramebuffer(i.READ_FRAMEBUFFER,st.__webglMultisampledFramebuffer),A.texture.mipmaps.length>0?e.bindFramebuffer(i.DRAW_FRAMEBUFFER,st.__webglFramebuffer[0]):e.bindFramebuffer(i.DRAW_FRAMEBUFFER,st.__webglFramebuffer);for(let dt=0;dt<S.length;dt++){if(A.resolveDepthBuffer&&(A.depthBuffer&&(N|=i.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&(N|=i.STENCIL_BUFFER_BIT)),X){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,st.__webglColorRenderbuffer[dt]);const I=n.get(S[dt]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,I,0)}i.blitFramebuffer(0,0,W,at,0,0,W,at,N,i.NEAREST),l===!0&&(ue.length=0,ue.push(i.COLOR_ATTACHMENT0+dt),A.depthBuffer&&A.storeMultisampledDepthBuffer===!1&&ue.push(J),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,ue))}if(e.bindFramebuffer(i.READ_FRAMEBUFFER,null),e.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),X)for(let dt=0;dt<S.length;dt++){e.bindFramebuffer(i.FRAMEBUFFER,st.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+dt,i.RENDERBUFFER,st.__webglColorRenderbuffer[dt]);const I=n.get(S[dt]).__webglTexture;e.bindFramebuffer(i.FRAMEBUFFER,st.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+dt,i.TEXTURE_2D,I,0)}e.bindFramebuffer(i.DRAW_FRAMEBUFFER,st.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.storeMultisampledDepthBuffer===!1&&l){const S=A.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[S])}}}function se(A){return Math.min(s.maxSamples,A.samples)}function xt(A){const S=n.get(A);return A.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&S.__useRenderToTexture!==!1}function ge(A){const S=o.render.frame;h.get(A)!==S&&(h.set(A,S),A.update())}function It(A,S){const W=A.colorSpace,at=A.format,N=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||W!==br&&W!==ii&&(Kt.getTransfer(W)===re?(at!==Pn||N!==mn)&&Ot("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Qt("WebGLTextures: Unsupported texture color space:",W)),S}function Nt(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(c.width=A.naturalWidth||A.width,c.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(c.width=A.displayWidth,c.height=A.displayHeight):(c.width=A.width,c.height=A.height),c}this.allocateTextureUnit=bt,this.resetTextureUnits=Q,this.getTextureUnits=it,this.setTextureUnits=_t,this.setTexture2D=lt,this.setTexture2DArray=St,this.setTexture3D=Tt,this.setTextureCube=gt,this.rebindTextures=Ce,this.setupRenderTarget=fe,this.updateRenderTargetMipmap=k,this.updateMultisampleRenderTarget=ne,this.setupDepthRenderbuffer=Re,this.setupFrameBufferTexture=ie,this.useMultisampledRTT=xt,this.dispose=V}function Ng(i,t){function e(n,s=ii){let r;const o=Kt.getTransfer(s);if(n===mn)return i.UNSIGNED_BYTE;if(n===ba)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Ta)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Fc)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Oc)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Nc)return i.BYTE;if(n===Uc)return i.SHORT;if(n===bs)return i.UNSIGNED_SHORT;if(n===Ea)return i.INT;if(n===Dn)return i.UNSIGNED_INT;if(n===Cn)return i.FLOAT;if(n===In)return i.HALF_FLOAT;if(n===zc)return i.ALPHA;if(n===Bc)return i.RGB;if(n===Pn)return i.RGBA;if(n===li)return i.DEPTH_COMPONENT;if(n===oi)return i.DEPTH_STENCIL;if(n===Gc)return i.RED;if(n===Aa)return i.RED_INTEGER;if(n===wi)return i.RG;if(n===Ra)return i.RG_INTEGER;if(n===Ca)return i.RGBA_INTEGER;if(n===mr||n===gr||n===_r||n===xr)if(o===re)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===mr)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===gr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===_r)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===xr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===mr)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===gr)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===_r)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===xr)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===No||n===Uo||n===Fo||n===Oo)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===No)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Uo)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Fo)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Oo)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===zo||n===Bo||n===Go||n===ko||n===Ho||n===wr||n===Vo)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(n===zo||n===Bo)return o===re?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Go)return o===re?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===ko)return r.COMPRESSED_R11_EAC;if(n===Ho)return r.COMPRESSED_SIGNED_R11_EAC;if(n===wr)return r.COMPRESSED_RG11_EAC;if(n===Vo)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Wo||n===Xo||n===Yo||n===qo||n===Zo||n===Ko||n===Jo||n===$o||n===Qo||n===jo||n===ta||n===ea||n===na||n===ia)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Wo)return o===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Xo)return o===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Yo)return o===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===qo)return o===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Zo)return o===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Ko)return o===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Jo)return o===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===$o)return o===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Qo)return o===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===jo)return o===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===ta)return o===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===ea)return o===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===na)return o===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===ia)return o===re?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===sa||n===ra||n===oa)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(n===sa)return o===re?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===ra)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===oa)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===aa||n===la||n===Er||n===ca)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(n===aa)return r.COMPRESSED_RED_RGTC1_EXT;if(n===la)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Er)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===ca)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===$i?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:e}}const Ug=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Fg=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Og{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){const n=new ih(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=n}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,n=new bn({vertexShader:Ug,fragmentShader:Fg,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new mt(new ts(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class zg extends ui{constructor(t,e){super();const n=this;let s=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,u=null,d=null,f=null,_=null;const M=typeof XRWebGLBinding<"u",p=new Og,m={},x=e.getContextAttributes();let y=null,v=null;const T=[],b=[],g=new ot;let w=null,P=null;const C=new _n;C.viewport=new xe;const D=new _n;D.viewport=new xe;const F=[C,D],U=new Zd;let L=null,V=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(K){let lt=T[K];return lt===void 0&&(lt=new to,T[K]=lt),lt.getTargetRaySpace()},this.getControllerGrip=function(K){let lt=T[K];return lt===void 0&&(lt=new to,T[K]=lt),lt.getGripSpace()},this.getHand=function(K){let lt=T[K];return lt===void 0&&(lt=new to,T[K]=lt),lt.getHandSpace()};function B(K){const lt=b.indexOf(K.inputSource);if(lt===-1)return;const St=T[lt];St!==void 0&&(St.update(K.inputSource,K.frame,c||o),St.dispatchEvent({type:K.type,data:K.inputSource}))}function z(){s.removeEventListener("select",B),s.removeEventListener("selectstart",B),s.removeEventListener("selectend",B),s.removeEventListener("squeeze",B),s.removeEventListener("squeezestart",B),s.removeEventListener("squeezeend",B),s.removeEventListener("end",z),s.removeEventListener("inputsourceschange",nt);for(let K=0;K<T.length;K++){const lt=b[K];lt!==null&&(b[K]=null,T[K].disconnect(lt))}L=null,V=null,p.reset();for(const K in m)delete m[K];if(t.setRenderTarget(y),f=null,d=null,u=null,s=null,v=null,bt.stop(),n.isPresenting=!1,t.setPixelRatio(w),t.setSize(g.width,g.height,!1),P!==null){const K=P.camera;K.fov=P.fov,K.zoom=P.zoom,K.updateProjectionMatrix(),P=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(K){r=K,n.isPresenting===!0&&Ot("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(K){a=K,n.isPresenting===!0&&Ot("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(K){c=K},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return u===null&&M&&(u=new XRWebGLBinding(s,e)),u},this.getFrame=function(){return _},this.getSession=function(){return s},this.setSession=async function(K){if(s=K,s!==null){if(y=t.getRenderTarget(),s.addEventListener("select",B),s.addEventListener("selectstart",B),s.addEventListener("selectend",B),s.addEventListener("squeeze",B),s.addEventListener("squeezestart",B),s.addEventListener("squeezeend",B),s.addEventListener("end",z),s.addEventListener("inputsourceschange",nt),x.xrCompatible!==!0&&await e.makeXRCompatible(),w=t.getPixelRatio(),t.getSize(g),M&&"createProjectionLayer"in XRWebGLBinding.prototype){let St=null,Tt=null,gt=null;x.depth&&(gt=x.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,St=x.stencil?oi:li,Tt=x.stencil?$i:Dn);const Ft={colorFormat:e.RGBA8,depthFormat:gt,scaleFactor:r};u=this.getBinding(),d=u.createProjectionLayer(Ft),s.updateRenderState({layers:[d]}),t.setPixelRatio(1),t.setSize(d.textureWidth,d.textureHeight,!1),v=new Ln(d.textureWidth,d.textureHeight,{format:Pn,type:mn,depthTexture:new Qi(d.textureWidth,d.textureHeight,Tt,void 0,void 0,void 0,void 0,void 0,void 0,St),stencilBuffer:x.stencil,colorSpace:t.outputColorSpace,samples:x.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}else{const St={antialias:x.antialias,alpha:!0,depth:x.depth,stencil:x.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,e,St),s.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),v=new Ln(f.framebufferWidth,f.framebufferHeight,{format:Pn,type:mn,colorSpace:t.outputColorSpace,stencilBuffer:x.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),bt.setContext(s),bt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function nt(K){for(let lt=0;lt<K.removed.length;lt++){const St=K.removed[lt],Tt=b.indexOf(St);Tt>=0&&(b[Tt]=null,T[Tt].disconnect(St))}for(let lt=0;lt<K.added.length;lt++){const St=K.added[lt];let Tt=b.indexOf(St);if(Tt===-1){for(let Ft=0;Ft<T.length;Ft++)if(Ft>=b.length){b.push(St),Tt=Ft;break}else if(b[Ft]===null){b[Ft]=St,Tt=Ft;break}if(Tt===-1)break}const gt=T[Tt];gt&&gt.connect(St)}}function H(K,lt){lt===null?K.matrixWorld.copy(K.matrix):K.matrixWorld.multiplyMatrices(lt.matrixWorld,K.matrix),K.matrixWorldInverse.copy(K.matrixWorld).invert()}this.updateCamera=function(K){if(s===null)return;let lt=K.near,St=K.far;p.texture!==null&&(p.depthNear>0&&(lt=p.depthNear),p.depthFar>0&&(St=p.depthFar)),U.near=D.near=C.near=lt,U.far=D.far=C.far=St,(L!==U.near||V!==U.far)&&(s.updateRenderState({depthNear:U.near,depthFar:U.far}),L=U.near,V=U.far),U.layers.mask=K.layers.mask|6,C.layers.mask=U.layers.mask&-5,D.layers.mask=U.layers.mask&-3;const Tt=K.parent,gt=U.cameras;H(U,Tt);for(let Ft=0;Ft<gt.length;Ft++)H(gt[Ft],Tt);U.projectionMatrix.copy(C.projectionMatrix),U.projectionMatrixInverse.copy(C.projectionMatrixInverse),P===null&&K.isPerspectiveCamera&&(P={camera:K,fov:K.fov,zoom:K.zoom}),Q(K,U,Tt)};function Q(K,lt,St){St===null?K.matrix.copy(lt.matrixWorld):(K.matrix.copy(St.matrixWorld),K.matrix.invert(),K.matrix.multiply(lt.matrixWorld)),K.matrix.decompose(K.position,K.quaternion,K.scale),K.updateMatrixWorld(!0),K.projectionMatrix.copy(lt.projectionMatrix),K.projectionMatrixInverse.copy(lt.projectionMatrixInverse),K.isPerspectiveCamera&&(K.fov=As*2*Math.atan(1/K.projectionMatrix.elements[5]),K.zoom=1)}this.getCamera=function(){return U},this.getFoveation=function(){if(!(d===null&&f===null))return l},this.setFoveation=function(K){l=K,d!==null&&(d.fixedFoveation=K),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=K)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(U)},this.getCameraTexture=function(K){return m[K]};let it=null;function _t(K,lt){if(h=lt.getViewerPose(c||o),_=lt,h!==null){const St=h.views;f!==null&&(t.setRenderTargetFramebuffer(v,f.framebuffer),t.setRenderTarget(v));let Tt=!1;St.length!==U.cameras.length&&(U.cameras.length=0,Tt=!0);for(let Pt=0;Pt<St.length;Pt++){const zt=St[Pt];let Yt=null;if(f!==null)Yt=f.getViewport(zt);else{const me=u.getViewSubImage(d,zt);Yt=me.viewport,Pt===0&&(t.setRenderTargetTextures(v,me.colorTexture,me.depthStencilTexture),t.setRenderTarget(v))}let kt=F[Pt];kt===void 0&&(kt=new _n,kt.layers.enable(Pt),kt.viewport=new xe,F[Pt]=kt),kt.matrix.fromArray(zt.transform.matrix),kt.matrix.decompose(kt.position,kt.quaternion,kt.scale),kt.projectionMatrix.fromArray(zt.projectionMatrix),kt.projectionMatrixInverse.copy(kt.projectionMatrix).invert(),kt.viewport.set(Yt.x,Yt.y,Yt.width,Yt.height),Pt===0&&(U.matrix.copy(kt.matrix),U.matrix.decompose(U.position,U.quaternion,U.scale)),Tt===!0&&U.cameras.push(kt)}const gt=s.enabledFeatures;if(gt&&gt.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&M){u=n.getBinding();const Pt=u.getDepthInformation(St[0]);Pt&&Pt.isValid&&Pt.texture&&p.init(Pt,s.renderState)}if(gt&&gt.includes("camera-access")&&M){t.state.unbindTexture(),u=n.getBinding();for(let Pt=0;Pt<St.length;Pt++){const zt=St[Pt].camera;if(zt){let Yt=m[zt];Yt||(Yt=new ih,m[zt]=Yt);const kt=u.getCameraImage(zt);Yt.sourceTexture=kt}}}}for(let St=0;St<T.length;St++){const Tt=b[St],gt=T[St];Tt!==null&&gt!==void 0&&gt.update(Tt,lt,c||o)}it&&it(K,lt),lt.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:lt}),_=null}const bt=new xh;bt.setAnimationLoop(_t),this.setAnimationLoop=function(K){it=K},this.dispose=function(){}}}const Bg=new he,Rh=new Bt;Rh.set(-1,0,0,0,1,0,0,0,1);function Gg(i,t){function e(p,m){p.matrixAutoUpdate===!0&&p.updateMatrix(),m.value.copy(p.matrix)}function n(p,m){m.color.getRGB(p.fogColor.value,fh(i)),m.isFog?(p.fogNear.value=m.near,p.fogFar.value=m.far):m.isFogExp2&&(p.fogDensity.value=m.density)}function s(p,m,x,y,v){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?r(p,m):m.isMeshLambertMaterial?(r(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(r(p,m),u(p,m)):m.isMeshPhongMaterial?(r(p,m),h(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(r(p,m),d(p,m),m.isMeshPhysicalMaterial&&f(p,m,v)):m.isMeshMatcapMaterial?(r(p,m),_(p,m)):m.isMeshDepthMaterial?r(p,m):m.isMeshDistanceMaterial?(r(p,m),M(p,m)):m.isMeshNormalMaterial?r(p,m):m.isLineBasicMaterial?(o(p,m),m.isLineDashedMaterial&&a(p,m)):m.isPointsMaterial?l(p,m,x,y):m.isSpriteMaterial?c(p,m):m.isShadowMaterial?(p.color.value.copy(m.color),p.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(p,m){p.opacity.value=m.opacity,m.color&&p.diffuse.value.copy(m.color),m.emissive&&p.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(p.map.value=m.map,e(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.bumpMap&&(p.bumpMap.value=m.bumpMap,e(m.bumpMap,p.bumpMapTransform),p.bumpScale.value=m.bumpScale,m.side===Je&&(p.bumpScale.value*=-1)),m.normalMap&&(p.normalMap.value=m.normalMap,e(m.normalMap,p.normalMapTransform),p.normalScale.value.copy(m.normalScale),m.side===Je&&p.normalScale.value.negate()),m.displacementMap&&(p.displacementMap.value=m.displacementMap,e(m.displacementMap,p.displacementMapTransform),p.displacementScale.value=m.displacementScale,p.displacementBias.value=m.displacementBias),m.emissiveMap&&(p.emissiveMap.value=m.emissiveMap,e(m.emissiveMap,p.emissiveMapTransform)),m.specularMap&&(p.specularMap.value=m.specularMap,e(m.specularMap,p.specularMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);const x=t.get(m),y=x.envMap,v=x.envMapRotation;y&&(p.envMap.value=y,p.envMapRotation.value.setFromMatrix4(Bg.makeRotationFromEuler(v)).transpose(),y.isCubeTexture&&y.isRenderTargetTexture===!1&&p.envMapRotation.value.premultiply(Rh),p.reflectivity.value=m.reflectivity,p.ior.value=m.ior,p.refractionRatio.value=m.refractionRatio),m.lightMap&&(p.lightMap.value=m.lightMap,p.lightMapIntensity.value=m.lightMapIntensity,e(m.lightMap,p.lightMapTransform)),m.aoMap&&(p.aoMap.value=m.aoMap,p.aoMapIntensity.value=m.aoMapIntensity,e(m.aoMap,p.aoMapTransform))}function o(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,m.map&&(p.map.value=m.map,e(m.map,p.mapTransform))}function a(p,m){p.dashSize.value=m.dashSize,p.totalSize.value=m.dashSize+m.gapSize,p.scale.value=m.scale}function l(p,m,x,y){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.size.value=m.size*x,p.scale.value=y*.5,m.map&&(p.map.value=m.map,e(m.map,p.uvTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function c(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.rotation.value=m.rotation,m.map&&(p.map.value=m.map,e(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,e(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function h(p,m){p.specular.value.copy(m.specular),p.shininess.value=Math.max(m.shininess,1e-4)}function u(p,m){m.gradientMap&&(p.gradientMap.value=m.gradientMap)}function d(p,m){p.metalness.value=m.metalness,m.metalnessMap&&(p.metalnessMap.value=m.metalnessMap,e(m.metalnessMap,p.metalnessMapTransform)),p.roughness.value=m.roughness,m.roughnessMap&&(p.roughnessMap.value=m.roughnessMap,e(m.roughnessMap,p.roughnessMapTransform)),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)}function f(p,m,x){p.ior.value=m.ior,m.diffuseRoughness>0&&(p.diffuseRoughness.value=m.diffuseRoughness,m.diffuseRoughnessMap&&(p.diffuseRoughnessMap.value=m.diffuseRoughnessMap,e(m.diffuseRoughnessMap,p.diffuseRoughnessMapTransform))),m.sheen>0&&(p.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),p.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(p.sheenColorMap.value=m.sheenColorMap,e(m.sheenColorMap,p.sheenColorMapTransform)),m.sheenRoughnessMap&&(p.sheenRoughnessMap.value=m.sheenRoughnessMap,e(m.sheenRoughnessMap,p.sheenRoughnessMapTransform))),m.clearcoat>0&&(p.clearcoat.value=m.clearcoat,p.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(p.clearcoatMap.value=m.clearcoatMap,e(m.clearcoatMap,p.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,e(m.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(p.clearcoatNormalMap.value=m.clearcoatNormalMap,e(m.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===Je&&p.clearcoatNormalScale.value.negate())),m.dispersion>0&&(p.dispersion.value=m.dispersion),m.retroreflectivity>0&&(p.retroreflectivity.value=m.retroreflectivity),m.iridescence>0&&(p.iridescence.value=m.iridescence,p.iridescenceIOR.value=m.iridescenceIOR,p.iridescenceThicknessMinimum.value=m.iridescenceThicknessMinimum,p.iridescenceThicknessMaximum.value=m.iridescenceThicknessMaximum,m.iridescenceMap&&(p.iridescenceMap.value=m.iridescenceMap,e(m.iridescenceMap,p.iridescenceMapTransform)),m.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=m.iridescenceThicknessMap,e(m.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),m.transmission>0&&(p.transmission.value=m.transmission,p.transmissionSamplerMap.value=x.texture,p.transmissionSamplerSize.value.set(x.width,x.height),m.transmissionMap&&(p.transmissionMap.value=m.transmissionMap,e(m.transmissionMap,p.transmissionMapTransform)),p.thickness.value=m.thickness,m.thicknessMap&&(p.thicknessMap.value=m.thicknessMap,e(m.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=m.attenuationDistance,p.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(p.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(p.anisotropyMap.value=m.anisotropyMap,e(m.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=m.specularIntensity,p.specularColor.value.copy(m.specularColor),m.specularColorMap&&(p.specularColorMap.value=m.specularColorMap,e(m.specularColorMap,p.specularColorMapTransform)),m.specularIntensityMap&&(p.specularIntensityMap.value=m.specularIntensityMap,e(m.specularIntensityMap,p.specularIntensityMapTransform))}function _(p,m){m.matcap&&(p.matcap.value=m.matcap)}function M(p,m){const x=t.get(m).light;p.referencePosition.value.setFromMatrixPosition(x.matrixWorld),p.nearDistance.value=x.shadow.camera.near,p.farDistance.value=x.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function kg(i,t,e,n){let s={},r={};function o(x,y){const v=y.program;n.uniformBlockBinding(x,v,s[x.id])}function a(x,y){let v=s[x.id];v===void 0&&(_(x),v=l(x),s[x.id]=v,x.addEventListener("dispose",p));const T=y.program;n.updateUBOMapping(x,T);const b=t.render.frame;r[x.id]!==b&&(c(x),r[x.id]=b)}function l(x){const y=i.createBuffer(),v=x.__size,T=x.usage;return i.bindBuffer(i.UNIFORM_BUFFER,y),i.bufferData(i.UNIFORM_BUFFER,v,T),i.bindBuffer(i.UNIFORM_BUFFER,null),y}function c(x){const y=s[x.id],v=x.uniforms,T=x.__cache;i.bindBuffer(i.UNIFORM_BUFFER,y);for(let b=0,g=v.length;b<g;b++){const w=v[b];if(Array.isArray(w))for(let P=0,C=w.length;P<C;P++)h(w[P],b,P,T);else h(w,b,0,T)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function h(x,y,v,T){if(d(x,y,v,T)===!0){const b=x.__offset,g=x.value;if(Array.isArray(g)){let w=0;for(let P=0;P<g.length;P++){const C=g[P],D=M(C,!0);u(C,x.__data,w),w+=D.storage/Float32Array.BYTES_PER_ELEMENT}}else u(g,x.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,b,x.__data)}}function u(x,y,v){typeof x=="number"||typeof x=="boolean"?y[v]=x:x.isMatrix3?(y[v]=x.elements[0],y[v+1]=x.elements[1],y[v+2]=x.elements[2],y[v+3]=0,y[v+4]=x.elements[3],y[v+5]=x.elements[4],y[v+6]=x.elements[5],y[v+7]=0,y[v+8]=x.elements[6],y[v+9]=x.elements[7],y[v+10]=x.elements[8],y[v+11]=0):ArrayBuffer.isView(x)?y.set(x.subarray(0,y.length-v),v):x.toArray(y,v)}function d(x,y,v,T){const b=x.value,g=y+"_"+v;if(Array.isArray(b)){T[g]===void 0&&(T[g]=[]);const w=T[g];let P=!1;for(let C=0;C<b.length;C++)f(b[C],w,C)===!0&&(P=!0);return P}return f(b,T,g)}function f(x,y,v){if(y[v]===void 0)return typeof x=="number"||typeof x=="boolean"?y[v]=x:ArrayBuffer.isView(x)?y[v]=x.slice():y[v]=x.clone(),!0;{const T=y[v];if(typeof x=="number"||typeof x=="boolean"){if(T!==x)return y[v]=x,!0}else{if(ArrayBuffer.isView(x))return!0;if(T.equals(x)===!1)return T.copy(x),!0}}return!1}function _(x){const y=x.uniforms;let v=0;const T=16;for(let g=0,w=y.length;g<w;g++){const P=Array.isArray(y[g])?y[g]:[y[g]];for(let C=0,D=P.length;C<D;C++){const F=P[C],U=Array.isArray(F.value)?F.value:[F.value],L=Array.isArray(y[g])||Array.isArray(F.value);let V=v;for(let z=0,nt=U.length;z<nt;z++){const H=U[z],Q=M(H,L),it=v%T,_t=it%Q.boundary,bt=it+_t;v+=_t,bt!==0&&T-bt<Q.storage&&(v+=T-bt),z===0&&(V=v),v+=Q.storage}const B=F.type==="int"?Int32Array:F.type==="uint"?Uint32Array:Float32Array;F.__data=new B((v-V)/Float32Array.BYTES_PER_ELEMENT),F.__offset=V}}const b=v%T;return b>0&&(v+=T-b),x.__size=v,x.__cache={},this}function M(x,y){const v={boundary:0,storage:0};return typeof x=="number"||typeof x=="boolean"?(v.boundary=4,v.storage=4):x.isVector2?(v.boundary=8,v.storage=8):x.isVector3||x.isColor?(v.boundary=16,v.storage=12):x.isVector4?(v.boundary=16,v.storage=16):x.isMatrix3?(v.boundary=16,v.storage=48):x.isMatrix4?(v.boundary=16,v.storage=64):x.isTexture?Ot("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(x)?(v.boundary=16,v.storage=x.byteLength):Ot("WebGLRenderer: Unsupported uniform value type.",x),y===!0&&(v.boundary=16,v.storage=Math.ceil(v.storage/16)*16),v}function p(x){const y=x.target;y.removeEventListener("dispose",p),i.deleteBuffer(s[y.id]),delete s[y.id],delete r[y.id]}function m(){for(const x in s)i.deleteBuffer(s[x]);s={},r={}}return{bind:o,update:a,dispose:m}}const Hg=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let An=null;function Vg(){return An===null&&(An=new od(Hg,16,16,wi,In),An.name="DFG_LUT",An.minFilter=cn,An.magFilter=cn,An.wrapS=Wn,An.wrapT=Wn,An.generateMipmaps=!1,An.needsUpdate=!0),An}class Wg{constructor(t={}){const{canvas:e=vu(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=mn}=t;this.isWebGLRenderer=!0;let _;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");_=n.getContextAttributes().alpha}else _=o;const M=f,p=new Set([Ca,Ra,Aa]),m=new Set([mn,Dn,bs,$i,ba,Ta]),x=new Uint32Array(4),y=new Int32Array(4),v={textures:[],min:[],max:[],resolution:[]};let T=null,b=null;const g=[],w=[];let P=null;this.domElement=e,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Xn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const C=this;let D=!1,F=null,U=null,L=null,V=null;this._outputColorSpace=ke;let B=0,z=0,nt=null,H=-1,Q=null;const it=new xe,_t=new xe;let bt=null;const K=new wt(0);let lt=0,St=e.width,Tt=e.height,gt=1,Ft=null,oe=null;const Pt=new xe(0,0,St,Tt),zt=new xe(0,0,St,Tt);let Yt=!1;const kt=new Rs,me=new Fa;let ae=!1,we=!1;const ie=new he,Be=new R,de=new xe,Re={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Ce=!1;function fe(){return nt===null?gt:1}let k=n;function ue(E,O){return e.getContext(E,O)}let ne,se,xt,ge,It,Nt,A,S,W,at,N,J,st,X,$,dt,I,et,j,pt,ut,G,rt;try{const E={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${ya}`),e.addEventListener("webglcontextlost",ft,!1),e.addEventListener("webglcontextrestored",Dt,!1),e.addEventListener("webglcontextcreationerror",ht,!1),k===null){const O="webgl2";if(k=ue(O,E),k===null)throw ue(O)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}ct()}catch(E){throw e.removeEventListener("webglcontextlost",ft,!1),e.removeEventListener("webglcontextrestored",Dt,!1),e.removeEventListener("webglcontextcreationerror",ht,!1),Qt("WebGLRenderer: "+E.message),E}function ct(){ne=new qm(k),ne.init(),ut=new Ng(k,ne),se=new Fm(k,ne,t,ut),xt=new Dg(k,ne),se.reversedDepthBuffer&&d&&xt.buffers.depth.setReversed(!0),U=k.createFramebuffer(),L=k.createFramebuffer(),V=k.createFramebuffer(),ge=new Jm(k),It=new xg,Nt=new Ig(k,ne,xt,It,se,ut,ge),A=new Ym(C),S=new $d(k),G=new Nm(k,S),W=new Zm(k,S,ge,G),at=new Qm(k,W,S,G,ge),et=new $m(k,se,Nt),$=new Om(It),N=new _g(C,A,ne,se,G,$),J=new Gg(C,It),st=new Mg,X=new Tg(ne),I=new Im(C,A,xt,at,_,l),dt=new Lg(C,at,se),rt=new kg(k,ge,se,xt),j=new Um(k,ne,ge),pt=new Km(k,ne,ge),ge.programs=N.programs,C.capabilities=se,C.extensions=ne,C.properties=It,C.renderLists=st,C.shadowMap=dt,C.state=xt,C.info=ge}M!==mn&&(P=new t0(M,e.width,e.height,a,s,r));const tt=new zg(C,k);this.xr=tt,this.getContext=function(){return k},this.getContextAttributes=function(){return k.getContextAttributes()},this.forceContextLoss=function(){const E=ne.get("WEBGL_lose_context");E&&E.loseContext()},this.forceContextRestore=function(){const E=ne.get("WEBGL_lose_context");E&&E.restoreContext()},this.getPixelRatio=function(){return gt},this.setPixelRatio=function(E){E!==void 0&&(gt=E,this.setSize(St,Tt,!1))},this.getSize=function(E){return E.set(St,Tt)},this.setSize=function(E,O,Z=!0){if(tt.isPresenting){Ot("WebGLRenderer: Can't change size while VR device is presenting.");return}St=E,Tt=O,e.width=Math.floor(E*gt),e.height=Math.floor(O*gt),Z===!0&&(e.style.width=E+"px",e.style.height=O+"px"),P!==null&&P.setSize(e.width,e.height),this.setViewport(0,0,E,O)},this.getDrawingBufferSize=function(E){return E.set(St*gt,Tt*gt).floor()},this.setDrawingBufferSize=function(E,O,Z){St=E,Tt=O,gt=Z,e.width=Math.floor(E*Z),e.height=Math.floor(O*Z),this.setViewport(0,0,E,O)},this.setEffects=function(E){if(M===mn){Qt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(E){for(let O=0;O<E.length;O++)if(E[O].isOutputPass===!0){Ot("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}P.setEffects(E||[])},this.getCurrentViewport=function(E){return E.copy(it)},this.getViewport=function(E){return E.copy(Pt)},this.setViewport=function(E,O,Z,Y){E.isVector4?Pt.set(E.x,E.y,E.z,E.w):Pt.set(E,O,Z,Y),xt.viewport(it.copy(Pt).multiplyScalar(fe()).round())},this.getScissor=function(E){return E.copy(zt)},this.setScissor=function(E,O,Z,Y){E.isVector4?zt.set(E.x,E.y,E.z,E.w):zt.set(E,O,Z,Y),xt.scissor(_t.copy(zt).multiplyScalar(fe()).round())},this.getScissorTest=function(){return Yt},this.setScissorTest=function(E){xt.setScissorTest(Yt=E)},this.setOpaqueSort=function(E){Ft=E},this.setTransparentSort=function(E){oe=E},this.getClearColor=function(E){return E.copy(I.getClearColor())},this.setClearColor=function(){I.setClearColor(...arguments)},this.getClearAlpha=function(){return I.getClearAlpha()},this.setClearAlpha=function(){I.setClearAlpha(...arguments)},this.clear=function(E=!0,O=!0,Z=!0){let Y=0;if(E){let q=!1;if(nt!==null){const Mt=nt.texture.format;q=p.has(Mt)}if(q){const Mt=nt.texture.type,At=m.has(Mt),vt=I.getClearColor(),Et=I.getClearAlpha(),Lt=vt.r,Gt=vt.g,qt=vt.b;At?(x[0]=Lt,x[1]=Gt,x[2]=qt,x[3]=Et,k.clearBufferuiv(k.COLOR,0,x)):(y[0]=Lt,y[1]=Gt,y[2]=qt,y[3]=Et,k.clearBufferiv(k.COLOR,0,y))}else Y|=k.COLOR_BUFFER_BIT}O&&(Y|=k.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),Z&&(Y|=k.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),Y!==0&&k.clear(Y)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(E){E.setRenderer(this),F=E},this.dispose=function(){e.removeEventListener("webglcontextlost",ft,!1),e.removeEventListener("webglcontextrestored",Dt,!1),e.removeEventListener("webglcontextcreationerror",ht,!1),I.dispose(),st.dispose(),X.dispose(),Nt.dispose(),It.dispose(),A.dispose(),at.dispose(),W.dispose(),G.dispose(),rt.dispose(),N.dispose(),tt.dispose(),tt.removeEventListener("sessionstart",ye),tt.removeEventListener("sessionend",Ti),di.stop()};function ft(E){E.preventDefault(),Rr("WebGLRenderer: Context Lost."),D=!0}function Dt(){Rr("WebGLRenderer: Context Restored."),D=!1;const E=ge.autoReset,O=dt.enabled,Z=dt.autoUpdate,Y=dt.needsUpdate,q=dt.type;ct(),ge.autoReset=E,dt.enabled=O,dt.autoUpdate=Z,dt.needsUpdate=Y,dt.type=q}function ht(E){Qt("WebGLRenderer: A WebGL context could not be created. Reason: ",E.statusMessage)}function Ut(E){const O=E.target;O.removeEventListener("dispose",Ut),Jt(O)}function Jt(E){Se(E),It.remove(E)}function Se(E){const O=It.get(E).programs;O!==void 0&&(O.forEach(function(Z){N.releaseProgram(Z)}),E.isShaderMaterial&&N.releaseShaderCache(E))}this.renderBufferDirect=function(E,O,Z,Y,q,Mt){O===null&&(O=Re);const At=q.isMesh&&q.matrixWorld.determinantAffine()<0,vt=Oh(E,O,Z,Y,q);xt.setMaterial(Y,At);let Et=Z.index,Lt=1;if(Y.wireframe===!0){if(Et=W.getWireframeAttribute(Z),Et===void 0)return;Lt=2}const Gt=Z.drawRange,qt=Z.attributes.position;let Rt=Gt.start*Lt,Zt=(Gt.start+Gt.count)*Lt;Mt!==null&&(Rt=Math.max(Rt,Mt.start*Lt),Zt=Math.min(Zt,(Mt.start+Mt.count)*Lt)),Et!==null?(Rt=Math.max(Rt,0),Zt=Math.min(Zt,Et.count)):qt!=null&&(Rt=Math.max(Rt,0),Zt=Math.min(Zt,qt.count));const be=Zt-Rt;if(be<0||be===1/0)return;G.setup(q,Y,vt,Z,Et);let ce,le=j;if(Et!==null&&(ce=S.get(Et),le=pt,le.setIndex(ce)),q.isMesh)Y.wireframe===!0?(xt.setLineWidth(Y.wireframeLinewidth*fe()),le.setMode(k.LINES)):le.setMode(k.TRIANGLES);else if(q.isLine){let We=Y.linewidth;We===void 0&&(We=1),xt.setLineWidth(We*fe()),q.isLineSegments?le.setMode(k.LINES):q.isLineLoop?le.setMode(k.LINE_LOOP):le.setMode(k.LINE_STRIP)}else q.isPoints?le.setMode(k.POINTS):q.isSprite&&le.setMode(k.TRIANGLES);if(q.isBatchedMesh)if(ne.get("WEBGL_multi_draw"))le.renderMultiDraw(q._multiDrawStarts,q._multiDrawCounts,q._multiDrawCount);else{const We=q._multiDrawStarts,Ct=q._multiDrawCounts,Qe=q._multiDrawCount,jt=Et?S.get(Et).bytesPerElement:1,fi=It.get(Y).currentProgram.getUniforms();for(let Xe=0;Xe<Qe;Xe++)fi.setValue(k,"_gl_DrawID",Xe),le.render(We[Xe]/jt,Ct[Xe])}else if(q.isInstancedMesh)le.renderInstances(Rt,be,q.count);else if(Z.isInstancedBufferGeometry){const We=Z._maxInstanceCount!==void 0?Z._maxInstanceCount:1/0,Ct=Math.min(Z.instanceCount,We);le.renderInstances(Rt,be,Ct)}else le.render(Rt,be)};function pe(E,O,Z,Y){F!==null&&E.isNodeMaterial&&F.setObject(Y,E),ae===!0&&$.setState(E,Z,!1),E.transparent===!0&&E.side===sn&&E.forceSinglePass===!1?(E.side=Je,E.needsUpdate=!0,is(E,O,Y),E.side=yi,E.needsUpdate=!0,is(E,O,Y),E.side=sn):is(E,O,Y)}this.compile=function(E,O,Z=null){Z===null&&(Z=E),F!==null&&F.renderStart(E,O,Z),b=X.get(Z),b.init(O),w.push(b),Z.traverseVisible(function(q){q.isLight&&q.layers.test(O.layers)&&(b.pushLight(q),q.castShadow&&b.pushShadow(q))}),E!==Z&&E.traverseVisible(function(q){q.isLight&&q.layers.test(O.layers)&&(b.pushLight(q),q.castShadow&&b.pushShadow(q))}),b.setupLights(),F!==null&&F.updateLights(b.state.lightsArray),we=this.localClippingEnabled,ae=$.init(this.clippingPlanes,we),ae===!0&&$.setGlobalState(this.clippingPlanes,O),F!==null&&dt.render(b.state.shadowsArray,Z,O);const Y=new Set;return E.traverse(function(q){if(!(q.isMesh||q.isPoints||q.isLine||q.isSprite))return;const Mt=q.material;if(Mt)if(Array.isArray(Mt))for(let At=0;At<Mt.length;At++){const vt=Mt[At];pe(vt,Z,O,q),Y.add(vt)}else pe(Mt,Z,O,q),Y.add(Mt)}),b=w.pop(),F!==null&&F.renderEnd(),Y},this.compileAsync=function(E,O,Z=null){const Y=this.compile(E,O,Z);return new Promise(q=>{function Mt(){if(Y.forEach(function(At){const Et=It.get(At).currentProgram;(Et===void 0||Et.isReady())&&Y.delete(At)}),Y.size===0){q(E);return}setTimeout(Mt,10)}ne.get("KHR_parallel_shader_compile")!==null?Mt():setTimeout(Mt,10)})};let Ee=null;function vn(E){Ee&&Ee(E)}function ye(){di.stop()}function Ti(){di.start()}const di=new xh;di.setAnimationLoop(vn),typeof self<"u"&&di.setContext(self),this.setAnimationLoop=function(E){Ee=E,tt.setAnimationLoop(E),E===null?di.stop():di.start()},tt.addEventListener("sessionstart",ye),tt.addEventListener("sessionend",Ti),this.render=function(E,O){if(O!==void 0&&O.isCamera!==!0){Qt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(D===!0)return;F!==null&&F.renderStart(E,O);const Z=tt.enabled===!0&&tt.isPresenting===!0,Y=P!==null&&(nt===null||Z)&&P.begin(C,nt);if(E.matrixWorldAutoUpdate===!0&&E.updateMatrixWorld(),O.parent===null&&O.matrixWorldAutoUpdate===!0&&O.updateMatrixWorld(),tt.enabled===!0&&tt.isPresenting===!0&&(P===null||P.isCompositing()===!1)&&(tt.cameraAutoUpdate===!0&&tt.updateCamera(O),O=tt.getCamera()),E.isScene===!0&&E.onBeforeRender(C,E,O,nt),b=X.get(E,w.length),b.init(O),b.state.textureUnits=Nt.getTextureUnits(),w.push(b),ie.multiplyMatrices(O.projectionMatrix,O.matrixWorldInverse),O.isArrayCamera?me.setFromArrayCamera(O):kt.setFromProjectionMatrix(ie,En,O.reversedDepth),we=this.localClippingEnabled,ae=$.init(this.clippingPlanes,we),T=st.get(E,g.length),T.init(),g.push(T),this.info.render.frame++,tt.enabled===!0&&tt.isPresenting===!0){const At=C.xr.getDepthSensingMesh();At!==null&&Wr(At,O,-1/0,C.sortObjects)}Wr(E,O,0,C.sortObjects),T.finish(),F!==null&&F.updateLights(b.state.lightsArray),C.sortObjects===!0&&T.sort(Ft,oe),Ce=tt.enabled===!1||tt.isPresenting===!1||tt.hasDepthSensing()===!1,Ce&&I.addToRenderList(T,E),this.info.autoReset===!0&&this.info.reset(),ae===!0&&$.beginShadows();const q=b.state.shadowsArray;if(dt.render(q,E,O),ae===!0&&$.endShadows(),(Y&&P.hasRenderPass())===!1){const At=T.opaque,vt=T.transmissive;if(b.setupLights(),O.isArrayCamera){const Et=O.cameras;if(vt.length>0)for(let Lt=0,Gt=Et.length;Lt<Gt;Lt++){const qt=Et[Lt];il(At,vt,E,qt)}Ce&&I.render(E);for(let Lt=0,Gt=Et.length;Lt<Gt;Lt++){const qt=Et[Lt];nl(T,E,qt,qt.viewport)}}else vt.length>0&&il(At,vt,E,O),Ce&&I.render(E),nl(T,E,O)}nt!==null&&z===0&&(Nt.updateMultisampleRenderTarget(nt),Nt.updateRenderTargetMipmap(nt)),Y&&P.end(C),E.isScene===!0&&E.onAfterRender(C,E,O),G.resetDefaultState(),H=-1,Q=null,w.pop(),w.length>0?(b=w[w.length-1],Nt.setTextureUnits(b.state.textureUnits),ae===!0&&$.setGlobalState(C.clippingPlanes,b.state.camera)):b=null,g.pop(),g.length>0?T=g[g.length-1]:T=null,F!==null&&F.renderEnd()};function Wr(E,O,Z,Y){if(E.visible===!1)return;if(E.layers.test(O.layers)){if(E.isGroup)Z=E.renderOrder;else if(E.isLOD)E.autoUpdate===!0&&E.update(O);else if(E.isLight)b.pushLight(E),E.castShadow&&b.pushShadow(E);else if(E.isSprite){const At=O.isArrayCamera?me:kt;if(!E.frustumCulled||E.intersectsFrustum(At)){Y&&de.setFromMatrixPosition(E.matrixWorld).applyMatrix4(ie);const vt=at.update(E),Et=E.material;Et.visible&&T.push(E,vt,Et,Z,de.z,null,O)}}else if(E.isMesh||E.isLine||E.isPoints){const At=O.isArrayCamera?me:kt;if(!E.frustumCulled||E.intersectsFrustum(At)){const vt=at.update(E),Et=E.material;if(Y&&(E.boundingSphere!==void 0?(E.boundingSphere===null&&E.computeBoundingSphere(),de.copy(E.boundingSphere.center)):(vt.boundingSphere===null&&vt.computeBoundingSphere(),de.copy(vt.boundingSphere.center)),de.applyMatrix4(E.matrixWorld).applyMatrix4(ie)),Array.isArray(Et)){const Lt=vt.groups;for(let Gt=0,qt=Lt.length;Gt<qt;Gt++){const Rt=Lt[Gt],Zt=Et[Rt.materialIndex];Zt&&Zt.visible&&T.push(E,vt,Zt,Z,de.z,Rt,O)}}else Et.visible&&T.push(E,vt,Et,Z,de.z,null,O)}}}const Mt=E.children;for(let At=0,vt=Mt.length;At<vt;At++)Wr(Mt[At],O,Z,Y)}function nl(E,O,Z,Y){const{opaque:q,transmissive:Mt,transparent:At}=E;b.setupLightsView(Z),ae===!0&&$.setGlobalState(C.clippingPlanes,Z),Y&&xt.viewport(it.copy(Y)),q.length>0&&Fs(q,O,Z),Mt.length>0&&Fs(Mt,O,Z),At.length>0&&Fs(At,O,Z),xt.buffers.depth.setTest(!0),xt.buffers.depth.setMask(!0),xt.buffers.color.setMask(!0),xt.setPolygonOffset(!1)}function il(E,O,Z,Y){if((Z.isScene===!0?Z.overrideMaterial:null)!==null)return;if(b.state.transmissionRenderTarget[Y.id]===void 0){const Rt=ne.has("EXT_color_buffer_half_float")||ne.has("EXT_color_buffer_float");b.state.transmissionRenderTarget[Y.id]=new Ln(1,1,{generateMipmaps:!0,type:Rt?In:mn,minFilter:ri,samples:Math.max(4,se.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:Kt.workingColorSpace})}const Mt=b.state.transmissionRenderTarget[Y.id],At=Y.viewport||it;Mt.setSize(At.z*C.transmissionResolutionScale,At.w*C.transmissionResolutionScale);const vt=C.getRenderTarget(),Et=C.getActiveCubeFace(),Lt=C.getActiveMipmapLevel();C.setRenderTarget(Mt),C.getClearColor(K),lt=C.getClearAlpha(),lt<1&&C.setClearColor(16777215,.5),C.clear(),Ce&&I.render(Z);const Gt=C.toneMapping;C.toneMapping=Xn;const qt=Y.viewport;if(Y.viewport!==void 0&&(Y.viewport=void 0),b.setupLightsView(Y),ae===!0&&$.setGlobalState(C.clippingPlanes,Y),Fs(E,Z,Y),Nt.updateMultisampleRenderTarget(Mt),Nt.updateRenderTargetMipmap(Mt),ne.has("WEBGL_multisampled_render_to_texture")===!1){let Rt=!1;for(let Zt=0,be=O.length;Zt<be;Zt++){const ce=O[Zt],{object:le,geometry:We,material:Ct,group:Qe}=ce;if(Ct.side===sn&&le.layers.test(Y.layers)){const jt=Ct.side;Ct.side=Je,Ct.needsUpdate=!0,sl(le,Z,Y,We,Ct,Qe),Ct.side=jt,Ct.needsUpdate=!0,Rt=!0}}Rt===!0&&(Nt.updateMultisampleRenderTarget(Mt),Nt.updateRenderTargetMipmap(Mt))}C.setRenderTarget(vt,Et,Lt),C.setClearColor(K,lt),qt!==void 0&&(Y.viewport=qt),C.toneMapping=Gt}function Fs(E,O,Z){const Y=O.isScene===!0?O.overrideMaterial:null;for(let q=0,Mt=E.length;q<Mt;q++){const At=E[q],{object:vt,geometry:Et,group:Lt}=At;let Gt=At.material;Gt.allowOverride===!0&&Y!==null&&(Gt=Y),vt.layers.test(Z.layers)&&sl(vt,O,Z,Et,Gt,Lt)}}function sl(E,O,Z,Y,q,Mt){F!==null&&q.isNodeMaterial&&F.setObject(E,q),E.onBeforeRender(C,O,Z,Y,q,Mt),E.modelViewMatrix.multiplyMatrices(Z.matrixWorldInverse,E.matrixWorld),E.normalMatrix.getNormalMatrix(E.modelViewMatrix),q.onBeforeRender(C,O,Z,Y,E,Mt),q.transparent===!0&&q.side===sn&&q.forceSinglePass===!1?(q.side=Je,q.needsUpdate=!0,C.renderBufferDirect(Z,O,Y,q,E,Mt),q.side=yi,q.needsUpdate=!0,C.renderBufferDirect(Z,O,Y,q,E,Mt),q.side=sn):C.renderBufferDirect(Z,O,Y,q,E,Mt),E.onAfterRender(C,O,Z,Y,q,Mt)}function rl(E){let O=0;for(const Z of E)Z.texture!==null&&O++;return O}function is(E,O,Z){O.isScene!==!0&&(O=Re);const Y=It.get(E),q=b.state.lights,Mt=b.state.shadowsArray,At=q.state.version,vt=N.getParameters(E,q.state,Mt,O,Z,b.state.lightProbeGridArray),Et=N.getProgramCacheKey(vt);let Lt=Y.programs;Y.environment=E.isMeshStandardMaterial||E.isMeshLambertMaterial||E.isMeshPhongMaterial?O.environment:null,Y.fog=O.fog;const Gt=E.isMeshStandardMaterial||E.isMeshLambertMaterial&&!E.envMap||E.isMeshPhongMaterial&&!E.envMap;Y.envMap=A.get(E.envMap||Y.environment,Gt),Y.envMapRotation=Y.environment!==null&&E.envMap===null?O.environmentRotation:E.envMapRotation,Lt===void 0&&(E.addEventListener("dispose",Ut),Lt=new Map,Y.programs=Lt,Y.programVariants=new Map);let qt=Lt.get(Et);if(qt!==void 0){if(Y.currentProgram===qt&&Y.lightsStateVersion===At)return al(E,vt),qt}else vt.uniforms=N.getUniforms(E),F!==null&&E.isNodeMaterial&&F.build(E,Z,vt),E.onBeforeCompile(vt,C),qt=N.acquireProgram(vt,Et),Lt.set(Et,qt),Y.uniforms=vt.uniforms;const Rt=Y.uniforms;return(!E.isShaderMaterial&&!E.isRawShaderMaterial||E.clipping===!0)&&(Rt.clippingPlanes=$.uniform),al(E,vt),Y.needsLights=Bh(E),Y.lightsStateVersion=At,Y.needsLights&&(Rt.ambientLightColor.value=q.state.ambient,Rt.lightProbe.value=q.state.probe,Rt.sunLights.value=q.state.sun,Rt.sunLightShadows.value=q.state.sunShadow,Rt.directionalLights.value=q.state.directional,Rt.directionalLightShadows.value=q.state.directionalShadow,Rt.spotLights.value=q.state.spot,Rt.spotLightShadows.value=q.state.spotShadow,Rt.rectAreaLights.value=q.state.rectArea,Rt.ltc_1.value=q.state.rectAreaLTC1,Rt.ltc_2.value=q.state.rectAreaLTC2,Rt.pointLights.value=q.state.point,Rt.pointLightShadows.value=q.state.pointShadow,Rt.hemisphereLights.value=q.state.hemi,Rt.sunShadowMatrix.value=q.state.sunShadowMatrix,Rt.sunShadowCascade.value=q.state.sunShadowCascade,Rt.directionalShadowMatrix.value=q.state.directionalShadowMatrix,Rt.spotLightMatrix.value=q.state.spotLightMatrix,Rt.spotLightMap.value=q.state.spotLightMap,Rt.pointShadowMatrix.value=q.state.pointShadowMatrix),Y.numLightProbeGrids=rl(b.state.lightProbeGridArray),Y.currentProgram=qt,Y.uniformsList=null,qt}function Fh(E,O,Z,Y,q){const Mt=It.get(E),At=Mt.currentProgram.id+","+Y+","+q;let vt=Mt.programVariants.get(At);return vt===void 0?(vt=is(E,O,Z),Mt.programVariants.set(At,vt)):(Mt.currentProgram=vt,Mt.uniformsList=null,Mt.outputColorSpace=Y,Mt.toneMapping=q),vt}function ol(E){if(E.uniformsList===null){const O=E.currentProgram.getUniforms();E.uniformsList=Mr.seqWithValue(O.seq,E.uniforms)}return E.uniformsList}function al(E,O){const Z=It.get(E);Z.outputColorSpace=O.outputColorSpace,Z.batching=O.batching,Z.batchingColor=O.batchingColor,Z.instancing=O.instancing,Z.instancingColor=O.instancingColor,Z.instancingMorph=O.instancingMorph,Z.skinning=O.skinning,Z.morphTargets=O.morphTargets,Z.morphNormals=O.morphNormals,Z.morphColors=O.morphColors,Z.morphTargetsCount=O.morphTargetsCount,Z.numClippingPlanes=O.numClippingPlanes,Z.numIntersection=O.numClipIntersection,Z.vertexAlphas=O.vertexAlphas,Z.vertexTangents=O.vertexTangents,Z.toneMapping=O.toneMapping}function Oh(E,O,Z,Y,q){O.isScene!==!0&&(O=Re),Nt.resetTextureUnits();const Mt=O.fog,At=Y.isMeshStandardMaterial||Y.isMeshLambertMaterial||Y.isMeshPhongMaterial?O.environment:null,vt=nt===null?C.outputColorSpace:nt.isXRRenderTarget===!0?nt.texture.colorSpace:Kt.workingColorSpace,Et=Y.isMeshStandardMaterial||Y.isMeshLambertMaterial&&!Y.envMap||Y.isMeshPhongMaterial&&!Y.envMap,Lt=A.get(Y.envMap||At,Et),Gt=Y.vertexColors===!0&&!!Z.attributes.color&&Z.attributes.color.itemSize===4,qt=!!Z.attributes.tangent&&(!!Y.normalMap||Y.anisotropy>0),Rt=!!Z.morphAttributes.position,Zt=!!Z.morphAttributes.normal,be=!!Z.morphAttributes.color;let ce=Xn;Y.toneMapped&&(nt===null||nt.isXRRenderTarget===!0)&&(ce=C.toneMapping);const le=Z.morphAttributes.position||Z.morphAttributes.normal||Z.morphAttributes.color,We=le!==void 0?le.length:0,Ct=It.get(Y),Qe=b.state.lights;if(ae===!0&&(we===!0||E!==Q)){const _e=E===Q&&Y.id===H;$.setState(Y,E,_e)}let jt=!1,fi=!1;Y.version===Ct.__version?Ct.needsLights&&Ct.lightsStateVersion!==Qe.state.version||q.isBatchedMesh&&Ct.batching===!1||!q.isBatchedMesh&&Ct.batching===!0||q.isBatchedMesh&&Ct.batchingColor===!0&&q._colorsTexture===null||q.isBatchedMesh&&Ct.batchingColor===!1&&q._colorsTexture!==null||q.isInstancedMesh&&Ct.instancing===!1||!q.isInstancedMesh&&Ct.instancing===!0||q.isSkinnedMesh&&Ct.skinning===!1||!q.isSkinnedMesh&&Ct.skinning===!0||q.isInstancedMesh&&Ct.instancingColor===!0&&q.instanceColor===null||q.isInstancedMesh&&Ct.instancingColor===!1&&q.instanceColor!==null||q.isInstancedMesh&&Ct.instancingMorph===!0&&q.morphTexture===null||q.isInstancedMesh&&Ct.instancingMorph===!1&&q.morphTexture!==null||Ct.envMap!==Lt||Y.fog===!0&&Ct.fog!==Mt||Ct.numClippingPlanes!==void 0&&(Ct.numClippingPlanes!==$.numPlanes||Ct.numIntersection!==$.numIntersection)||Ct.vertexAlphas!==Gt||Ct.vertexTangents!==qt||Ct.morphTargets!==Rt||Ct.morphNormals!==Zt||Ct.morphColors!==be||Ct.morphTargetsCount!==We||Ct.numLightProbeGrids!==rl(b.state.lightProbeGridArray)?jt=!0:(Ct.outputColorSpace!==vt||Ct.toneMapping!==ce)&&(fi=!0):(jt=!0,Ct.__version=Y.version);let Xe=Ct.currentProgram;(jt===!0||fi===!0)&&(Xe=fi===!0?Fh(Y,O,q,vt,ce):is(Y,O,q),F&&Y.isNodeMaterial&&F.onUpdateProgram(Y,Xe,Ct));let Os=!1,Jn=!1,pi=!1;const $t=Xe.getUniforms(),Ge=Ct.uniforms;if(xt.useProgram(Xe.program)&&(Os=!0,Jn=!0,pi=!0),Y.id!==H&&(H=Y.id,Jn=!0),Os||Q!==E){xt.buffers.depth.getReversed()&&E.reversedDepth!==!0&&(E._reversedDepth=!0,E.updateProjectionMatrix()),$t.setValue(k,"projectionMatrix",E.projectionMatrix),$t.setValue(k,"viewMatrix",E.matrixWorldInverse);const Fe=$t.map.cameraPosition;Fe!==void 0&&Fe.setValue(k,Be.setFromMatrixPosition(E.matrixWorld)),se.logarithmicDepthBuffer&&$t.setValue(k,"logDepthBufFC",2/(Math.log(E.far+1)/Math.LN2)),(Y.isMeshPhongMaterial||Y.isMeshToonMaterial||Y.isMeshLambertMaterial||Y.isMeshBasicMaterial||Y.isMeshStandardMaterial||Y.isShaderMaterial)&&$t.setValue(k,"isOrthographic",E.isOrthographicCamera===!0),Q!==E&&(Q=E,Jn=!0,pi=!0)}if(Ct.needsLights&&(Qe.state.sunShadowMap.length>0&&$t.setValue(k,"sunShadowMap",Qe.state.sunShadowMap,Nt),Qe.state.directionalShadowMap.length>0&&$t.setValue(k,"directionalShadowMap",Qe.state.directionalShadowMap,Nt),Qe.state.spotShadowMap.length>0&&$t.setValue(k,"spotShadowMap",Qe.state.spotShadowMap,Nt),Qe.state.pointShadowMap.length>0&&$t.setValue(k,"pointShadowMap",Qe.state.pointShadowMap,Nt)),q.isSkinnedMesh){$t.setOptional(k,q,"bindMatrix"),$t.setOptional(k,q,"bindMatrixInverse");const _e=q.skeleton;_e&&(_e.boneTexture===null&&_e.computeBoneTexture(),$t.setValue(k,"boneTexture",_e.boneTexture,Nt))}q.isBatchedMesh&&($t.setOptional(k,q,"batchingTexture"),$t.setValue(k,"batchingTexture",q._matricesTexture,Nt),$t.setOptional(k,q,"batchingIdTexture"),$t.setValue(k,"batchingIdTexture",q._indirectTexture,Nt),$t.setOptional(k,q,"batchingColorTexture"),q._colorsTexture!==null&&$t.setValue(k,"batchingColorTexture",q._colorsTexture,Nt));const Mn=Z.morphAttributes;if((Mn.position!==void 0||Mn.normal!==void 0||Mn.color!==void 0)&&et.update(q,Z,Xe),(Jn||Ct.receiveShadow!==q.receiveShadow)&&(Ct.receiveShadow=q.receiveShadow,$t.setValue(k,"receiveShadow",q.receiveShadow)),(Y.isMeshStandardMaterial||Y.isMeshLambertMaterial||Y.isMeshPhongMaterial)&&Y.envMap===null&&O.environment!==null&&(Ge.envMapIntensity.value=O.environmentIntensity),Ge.dfgLUT!==void 0&&(Ge.dfgLUT.value=Vg()),Jn){if($t.setValue(k,"toneMappingExposure",C.toneMappingExposure),Ct.needsLights&&zh(Ge,pi),Mt&&Y.fog===!0&&J.refreshFogUniforms(Ge,Mt),J.refreshMaterialUniforms(Ge,Y,gt,Tt,b.state.transmissionRenderTarget[E.id]),Ct.needsLights&&Ct.numLightProbeGrids>0){const _e=v;let Fe=0;for(const Fn of b.state.lightProbeGridArray)Fn.texture!==null&&(_e.textures[Fe]=Fn.texture,_e.min[Fe]=Fn.boundingBox.min,_e.max[Fe]=Fn.boundingBox.max,_e.resolution[Fe]=Fn.resolution,Fe++);for(const Fn in _e)_e[Fn].length=Fe;Ge.probesSH.value=_e.textures,Ge.probesMin.value=_e.min,Ge.probesMax.value=_e.max,Ge.probesResolution.value=_e.resolution}Mr.upload(k,ol(Ct),Ge,Nt)}if(Y.isShaderMaterial&&Y.uniformsNeedUpdate===!0&&(Mr.upload(k,ol(Ct),Ge,Nt),Y.uniformsNeedUpdate=!1),Y.isSpriteMaterial&&$t.setValue(k,"center",q.center),$t.setValue(k,"modelViewMatrix",q.modelViewMatrix),$t.setValue(k,"normalMatrix",q.normalMatrix),$t.setValue(k,"modelMatrix",q.matrixWorld),Y.uniformsGroups!==void 0){const _e=Y.uniformsGroups;for(let Fe=0,Fn=_e.length;Fe<Fn;Fe++){const cl=_e[Fe];rt.update(cl,Xe),rt.bind(cl,Xe)}}return Xe}function zh(E,O){E.ambientLightColor.needsUpdate=O,E.lightProbe.needsUpdate=O,E.sunLights.needsUpdate=O,E.sunLightShadows.needsUpdate=O,E.directionalLights.needsUpdate=O,E.directionalLightShadows.needsUpdate=O,E.pointLights.needsUpdate=O,E.pointLightShadows.needsUpdate=O,E.spotLights.needsUpdate=O,E.spotLightShadows.needsUpdate=O,E.rectAreaLights.needsUpdate=O,E.hemisphereLights.needsUpdate=O}function Bh(E){return E.isMeshLambertMaterial||E.isMeshToonMaterial||E.isMeshPhongMaterial||E.isMeshStandardMaterial||E.isShadowMaterial||E.isShaderMaterial&&E.lights===!0}this.getActiveCubeFace=function(){return B},this.getActiveMipmapLevel=function(){return z},this.getRenderTarget=function(){return nt},this.setRenderTargetTextures=function(E,O,Z){const Y=It.get(E);Y.__autoAllocateDepthBuffer=E.resolveDepthBuffer===!1,Y.__autoAllocateDepthBuffer===!1&&(Y.__useRenderToTexture=!1),It.get(E.texture).__webglTexture=O,It.get(E.depthTexture).__webglTexture=Y.__autoAllocateDepthBuffer?void 0:Z,Y.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(E,O){const Z=It.get(E);Z.__webglFramebuffer=O,Z.__useDefaultFramebuffer=O===void 0},this.setRenderTarget=function(E,O=0,Z=0){nt=E,B=O,z=Z;let Y=null,q=!1,Mt=!1;if(E){const vt=It.get(E);if(vt.__useDefaultFramebuffer!==void 0){xt.bindFramebuffer(k.FRAMEBUFFER,vt.__webglFramebuffer),it.copy(E.viewport),_t.copy(E.scissor),bt=E.scissorTest,xt.viewport(it),xt.scissor(_t),xt.setScissorTest(bt),H=-1;return}else if(vt.__webglFramebuffer===void 0)Nt.setupRenderTarget(E);else if(vt.__hasExternalTextures)Nt.rebindTextures(E,It.get(E.texture).__webglTexture,It.get(E.depthTexture).__webglTexture);else if(E.depthBuffer){const Gt=E.depthTexture;if(vt.__boundDepthTexture!==Gt){if(Gt!==null&&It.has(Gt)&&(E.width!==Gt.image.width||E.height!==Gt.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");Nt.setupDepthRenderbuffer(E)}}const Et=E.texture;(Et.isData3DTexture||Et.isDataArrayTexture||Et.isCompressedArrayTexture)&&(Mt=!0);const Lt=It.get(E).__webglFramebuffer;E.isWebGLCubeRenderTarget?(Array.isArray(Lt[O])?Y=Lt[O][Z]:Y=Lt[O],q=!0):E.samples>0&&Nt.useMultisampledRTT(E)===!1?Y=It.get(E).__webglMultisampledFramebuffer:Array.isArray(Lt)?Y=Lt[Z]:Y=Lt,it.copy(E.viewport),_t.copy(E.scissor),bt=E.scissorTest}else it.copy(Pt).multiplyScalar(gt).floor(),_t.copy(zt).multiplyScalar(gt).floor(),bt=Yt;if(Z!==0&&(Y=U),xt.bindFramebuffer(k.FRAMEBUFFER,Y)&&xt.drawBuffers(E,Y),xt.viewport(it),xt.scissor(_t),xt.setScissorTest(bt),q){const vt=It.get(E.texture);k.framebufferTexture2D(k.FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_CUBE_MAP_POSITIVE_X+O,vt.__webglTexture,Z)}else if(Mt){const vt=O;for(let Et=0;Et<E.textures.length;Et++){const Lt=It.get(E.textures[Et]);k.framebufferTextureLayer(k.FRAMEBUFFER,k.COLOR_ATTACHMENT0+Et,Lt.__webglTexture,Z,vt)}}else if(E!==null&&Z!==0){const vt=It.get(E.texture);k.framebufferTexture2D(k.FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_2D,vt.__webglTexture,Z)}H=-1};function ll(E){const O=It.get(E);return(O.__readFormat!==E.format||O.__readType!==E.type)&&(O.__readFormat=E.format,O.__readType=E.type,O.__formatReadable=se.textureFormatReadable(E.format),O.__typeReadable=se.textureTypeReadable(E.type)),O}this.readRenderTargetPixels=function(E,O,Z,Y,q,Mt,At,vt=0){if(!(E&&E.isWebGLRenderTarget)){Qt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Et=It.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&At!==void 0&&(Et=Et[At],Array.isArray(Et)&&(Et=Et[0])),Et){xt.bindFramebuffer(k.FRAMEBUFFER,Et);try{const Lt=E.textures[vt],Gt=Lt.format,qt=Lt.type;E.textures.length>1&&k.readBuffer(k.COLOR_ATTACHMENT0+vt);const Rt=ll(Lt);if(Rt.__formatReadable===!1){Qt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(Rt.__typeReadable===!1){Qt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}O>=0&&O<=E.width-Y&&Z>=0&&Z<=E.height-q&&k.readPixels(O,Z,Y,q,ut.convert(Gt),ut.convert(qt),Mt)}finally{const Lt=nt!==null?It.get(nt).__webglFramebuffer:null;xt.bindFramebuffer(k.FRAMEBUFFER,Lt)}}},this.readRenderTargetPixelsAsync=async function(E,O,Z,Y,q,Mt,At,vt=0){if(!(E&&E.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Et=It.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&At!==void 0&&(Et=Et[At],Array.isArray(Et)&&(Et=Et[0])),Et)if(O>=0&&O<=E.width-Y&&Z>=0&&Z<=E.height-q){xt.bindFramebuffer(k.FRAMEBUFFER,Et);const Lt=E.textures[vt],Gt=Lt.format,qt=Lt.type;E.textures.length>1&&k.readBuffer(k.COLOR_ATTACHMENT0+vt);const Rt=ll(Lt);if(Rt.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(Rt.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Zt=k.createBuffer();k.bindBuffer(k.PIXEL_PACK_BUFFER,Zt),k.bufferData(k.PIXEL_PACK_BUFFER,Mt.byteLength,k.STREAM_READ),k.readPixels(O,Z,Y,q,ut.convert(Gt),ut.convert(qt),0),k.bindBuffer(k.PIXEL_PACK_BUFFER,null);const be=nt!==null?It.get(nt).__webglFramebuffer:null;xt.bindFramebuffer(k.FRAMEBUFFER,be);const ce=k.fenceSync(k.SYNC_GPU_COMMANDS_COMPLETE,0);return k.flush(),await Mu(k,ce,4),k.bindBuffer(k.PIXEL_PACK_BUFFER,Zt),k.getBufferSubData(k.PIXEL_PACK_BUFFER,0,Mt),k.bindBuffer(k.PIXEL_PACK_BUFFER,null),k.deleteBuffer(Zt),k.deleteSync(ce),Mt}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(E,O=null,Z=0){const Y=Math.pow(2,-Z),q=Math.floor(E.image.width*Y),Mt=Math.floor(E.image.height*Y),At=O!==null?O.x:0,vt=O!==null?O.y:0;Nt.setTexture2D(E,0),k.copyTexSubImage2D(k.TEXTURE_2D,Z,0,0,At,vt,q,Mt),xt.unbindTexture()},this.copyTextureToTexture=function(E,O,Z=null,Y=null,q=0,Mt=0){let At,vt,Et,Lt,Gt,qt,Rt,Zt,be;const ce=E.isCompressedTexture?E.mipmaps[Mt]:E.image;if(Z!==null)At=Z.max.x-Z.min.x,vt=Z.max.y-Z.min.y,Et=Z.isBox3?Z.max.z-Z.min.z:1,Lt=Z.min.x,Gt=Z.min.y,qt=Z.isBox3?Z.min.z:0;else{const $t=Math.pow(2,-q);At=Math.floor(ce.width*$t),vt=Math.floor(ce.height*$t),E.isDataArrayTexture?Et=ce.depth:E.isData3DTexture?Et=Math.floor(ce.depth*$t):Et=1,Lt=0,Gt=0,qt=0}Y!==null?(Rt=Y.x,Zt=Y.y,be=Y.z):(Rt=0,Zt=0,be=0);const le=ut.convert(O.format),We=ut.convert(O.type);let Ct;O.isData3DTexture?(Nt.setTexture3D(O,0),Ct=k.TEXTURE_3D):O.isDataArrayTexture||O.isCompressedArrayTexture?(Nt.setTexture2DArray(O,0),Ct=k.TEXTURE_2D_ARRAY):(Nt.setTexture2D(O,0),Ct=k.TEXTURE_2D),xt.activeTexture(k.TEXTURE0),xt.pixelStorei(k.UNPACK_FLIP_Y_WEBGL,O.flipY),xt.pixelStorei(k.UNPACK_PREMULTIPLY_ALPHA_WEBGL,O.premultiplyAlpha),xt.pixelStorei(k.UNPACK_ALIGNMENT,O.unpackAlignment);const Qe=xt.getParameter(k.UNPACK_ROW_LENGTH),jt=xt.getParameter(k.UNPACK_IMAGE_HEIGHT),fi=xt.getParameter(k.UNPACK_SKIP_PIXELS),Xe=xt.getParameter(k.UNPACK_SKIP_ROWS),Os=xt.getParameter(k.UNPACK_SKIP_IMAGES);xt.pixelStorei(k.UNPACK_ROW_LENGTH,ce.width),xt.pixelStorei(k.UNPACK_IMAGE_HEIGHT,ce.height),xt.pixelStorei(k.UNPACK_SKIP_PIXELS,Lt),xt.pixelStorei(k.UNPACK_SKIP_ROWS,Gt),xt.pixelStorei(k.UNPACK_SKIP_IMAGES,qt);const Jn=E.isDataArrayTexture||E.isData3DTexture,pi=O.isDataArrayTexture||O.isData3DTexture;if(E.isDepthTexture){const $t=It.get(E),Ge=It.get(O),Mn=It.get($t.__renderTarget),_e=It.get(Ge.__renderTarget);xt.bindFramebuffer(k.READ_FRAMEBUFFER,Mn.__webglFramebuffer),xt.bindFramebuffer(k.DRAW_FRAMEBUFFER,_e.__webglFramebuffer);for(let Fe=0;Fe<Et;Fe++)Jn&&(k.framebufferTextureLayer(k.READ_FRAMEBUFFER,k.COLOR_ATTACHMENT0,It.get(E).__webglTexture,q,qt+Fe),k.framebufferTextureLayer(k.DRAW_FRAMEBUFFER,k.COLOR_ATTACHMENT0,It.get(O).__webglTexture,Mt,be+Fe)),k.blitFramebuffer(Lt,Gt,Lt+At,Gt+vt,Rt,Zt,Rt+At,Zt+vt,k.DEPTH_BUFFER_BIT,k.NEAREST);xt.bindFramebuffer(k.READ_FRAMEBUFFER,null),xt.bindFramebuffer(k.DRAW_FRAMEBUFFER,null)}else if(q!==0||E.isRenderTargetTexture||It.has(E)){const $t=It.get(E),Ge=It.get(O);xt.bindFramebuffer(k.READ_FRAMEBUFFER,L),xt.bindFramebuffer(k.DRAW_FRAMEBUFFER,V);for(let Mn=0;Mn<Et;Mn++)Jn?k.framebufferTextureLayer(k.READ_FRAMEBUFFER,k.COLOR_ATTACHMENT0,$t.__webglTexture,q,qt+Mn):k.framebufferTexture2D(k.READ_FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_2D,$t.__webglTexture,q),pi?k.framebufferTextureLayer(k.DRAW_FRAMEBUFFER,k.COLOR_ATTACHMENT0,Ge.__webglTexture,Mt,be+Mn):k.framebufferTexture2D(k.DRAW_FRAMEBUFFER,k.COLOR_ATTACHMENT0,k.TEXTURE_2D,Ge.__webglTexture,Mt),q!==0?k.blitFramebuffer(Lt,Gt,Lt+At,Gt+vt,Rt,Zt,Rt+At,Zt+vt,k.COLOR_BUFFER_BIT,k.NEAREST):pi?k.copyTexSubImage3D(Ct,Mt,Rt,Zt,be+Mn,Lt,Gt,At,vt):k.copyTexSubImage2D(Ct,Mt,Rt,Zt,Lt,Gt,At,vt);xt.bindFramebuffer(k.READ_FRAMEBUFFER,null),xt.bindFramebuffer(k.DRAW_FRAMEBUFFER,null)}else pi?E.isDataTexture||E.isData3DTexture?k.texSubImage3D(Ct,Mt,Rt,Zt,be,At,vt,Et,le,We,ce.data):O.isCompressedArrayTexture?k.compressedTexSubImage3D(Ct,Mt,Rt,Zt,be,At,vt,Et,le,ce.data):k.texSubImage3D(Ct,Mt,Rt,Zt,be,At,vt,Et,le,We,ce):E.isDataTexture?k.texSubImage2D(k.TEXTURE_2D,Mt,Rt,Zt,At,vt,le,We,ce.data):E.isCompressedTexture?k.compressedTexSubImage2D(k.TEXTURE_2D,Mt,Rt,Zt,ce.width,ce.height,le,ce.data):k.texSubImage2D(k.TEXTURE_2D,Mt,Rt,Zt,At,vt,le,We,ce);xt.pixelStorei(k.UNPACK_ROW_LENGTH,Qe),xt.pixelStorei(k.UNPACK_IMAGE_HEIGHT,jt),xt.pixelStorei(k.UNPACK_SKIP_PIXELS,fi),xt.pixelStorei(k.UNPACK_SKIP_ROWS,Xe),xt.pixelStorei(k.UNPACK_SKIP_IMAGES,Os),Mt===0&&O.generateMipmaps===!0&&O.mipmapsAutoUpdate===!0&&k.generateMipmap(Ct),xt.unbindTexture()},this.initRenderTarget=function(E){It.get(E).__webglFramebuffer===void 0&&Nt.setupRenderTarget(E)},this.initTexture=function(E){E.isCubeTexture?Nt.setTextureCube(E,0):E.isData3DTexture?Nt.setTexture3D(E,0):E.isDataArrayTexture||E.isCompressedArrayTexture?Nt.setTexture2DArray(E,0):Nt.setTexture2D(E,0),xt.unbindTexture()},this.resetState=function(){B=0,z=0,nt=null,xt.reset(),G.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return En}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorSpace=Kt._getDrawingBufferColorSpace(t),e.unpackColorSpace=Kt._getUnpackColorSpace()}}const vc={type:"change"},Ya={type:"start"},Ch={type:"end"},fr=new Ua,Mc=new Hn,Xg=Math.cos(70*Ae.DEG2RAD),Pe=new R,an=2*Math.PI,te={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},wo=1e-6;class Yg extends Kd{constructor(t,e=null){super(t,e),this.state=te.NONE,this.target=new R,this.cursor=new R,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:qi.ROTATE,MIDDLE:qi.DOLLY,RIGHT:qi.PAN},this.touches={ONE:Xi.ROTATE,TWO:Xi.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new R,this._lastQuaternion=new ci,this._lastTargetPosition=new R,this._quat=new ci().setFromUnitVectors(t.up,new R(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Jl,this._sphericalDelta=new Jl,this._scale=1,this._panOffset=new R,this._rotateStart=new ot,this._rotateEnd=new ot,this._rotateDelta=new ot,this._panStart=new ot,this._panEnd=new ot,this._panDelta=new ot,this._dollyStart=new ot,this._dollyEnd=new ot,this._dollyDelta=new ot,this._dollyDirection=new R,this._mouse=new ot,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=Zg.bind(this),this._onPointerDown=qg.bind(this),this._onPointerUp=Kg.bind(this),this._onContextMenu=n_.bind(this),this._onMouseWheel=Qg.bind(this),this._onKeyDown=jg.bind(this),this._onTouchStart=t_.bind(this),this._onTouchMove=e_.bind(this),this._onMouseDown=Jg.bind(this),this._onMouseMove=$g.bind(this),this._interceptControlDown=i_.bind(this),this._interceptControlUp=s_.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(t){this._cursorStyle=t,t==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.ownerDocument.addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.state=te.NONE,this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.ownerDocument.removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{capture:!0}),this._controlActive=!1,this._pointers.length=0,this._pointerPositions={},this.domElement.style.touchAction="",this.domElement.style.cursor="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(vc),this.update(),this.state=te.NONE}pan(t,e){this._pan(t,e),this.update()}dollyIn(t){this._dollyIn(t),this.update()}dollyOut(t){this._dollyOut(t),this.update()}rotateLeft(t){this._rotateLeft(t),this.update()}rotateUp(t){this._rotateUp(t),this.update()}update(t=null){const e=this.object.position;Pe.copy(e).sub(this.target),Pe.applyQuaternion(this._quat),this._spherical.setFromVector3(Pe),this.autoRotate&&this.state===te.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=an:n>Math.PI&&(n-=an),s<-Math.PI?s+=an:s>Math.PI&&(s-=an),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=o!=this._spherical.radius}if(Pe.setFromSpherical(this._spherical),Pe.applyQuaternion(this._quatInverse),e.copy(this.target).add(Pe),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){const a=Pe.length();o=this._clampDistance(a*this._scale);const l=a-o;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){const a=new R(this._mouse.x,this._mouse.y,0);a.unproject(this.object);const l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;const c=new R(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(a),this.object.updateMatrixWorld(),o=Pe.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(fr.origin.copy(this.object.position),fr.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(fr.direction))<Xg?this.object.lookAt(this.target):(Mc.setFromNormalAndCoplanarPoint(this.object.up,this.target),fr.intersectPlane(Mc,this.target))))}else if(this.object.isOrthographicCamera){const o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>wo||8*(1-this._lastQuaternion.dot(this.object.quaternion))>wo||this._lastTargetPosition.distanceToSquared(this.target)>wo?(this.dispatchEvent(vc),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?an/60*this.autoRotateSpeed*t:an/60/60*this.autoRotateSpeed}_getZoomScale(t){const e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){Pe.setFromMatrixColumn(e,0),Pe.multiplyScalar(-t),this._panOffset.add(Pe)}_panUp(t,e){this.screenSpacePanning===!0?Pe.setFromMatrixColumn(e,1):(Pe.setFromMatrixColumn(e,0),Pe.crossVectors(this.object.up,Pe)),Pe.multiplyScalar(t),this._panOffset.add(Pe)}_pan(t,e){const n=this.domElement;if(this.object.isPerspectiveCamera){const s=this.object.position;Pe.copy(s).sub(this.target);let r=Pe.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/n.clientHeight,this.object.matrix),this._panUp(2*e*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const n=this.domElement.getBoundingClientRect(),s=t-n.left,r=e-n.top,o=n.width,a=n.height;this._mouse.x=s/o*2-1,this._mouse.y=-(r/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientY),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(an*this._rotateDelta.x/e.clientHeight),this._rotateUp(an*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.zoomToCursor&&(this._performCursorZoom=!0,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(an*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-an*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(an*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-an*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panStart.set(n,s)}}_handleTouchStartDolly(t){const e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{const n=this._getSecondPointerPosition(t),s=.5*(t.pageX+n.x),r=.5*(t.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(an*this._rotateDelta.x/e.clientHeight),this._rotateUp(an*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),n=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){const e=this._getSecondPointerPosition(t),n=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const o=(t.pageX+e.x)*.5,a=(t.pageY+e.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new ot,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){const e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){const e=t.deltaMode,n={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}}function qg(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function Zg(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function Kg(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Ch),this.state=te.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function Jg(i){let t;switch(i.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case qi.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=te.DOLLY;break;case qi.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=te.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=te.ROTATE}break;case qi.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=te.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=te.PAN}break;default:this.state=te.NONE}this.state!==te.NONE&&this.dispatchEvent(Ya)}function $g(i){switch(this.state){case te.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case te.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case te.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function Qg(i){this.enabled===!1||this.enableZoom===!1||this.state!==te.NONE||(i.preventDefault(),this.dispatchEvent(Ya),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Ch))}function jg(i){this.enabled!==!1&&this._handleKeyDown(i)}function t_(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case Xi.ROTATE:if(this.enableRotate===!1){this.state=te.NONE;break}this._handleTouchStartRotate(i),this.state=te.TOUCH_ROTATE;break;case Xi.PAN:if(this.enablePan===!1){this.state=te.NONE;break}this._handleTouchStartPan(i),this.state=te.TOUCH_PAN;break;default:this.state=te.NONE}break;case 2:switch(this.touches.TWO){case Xi.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=te.TOUCH_DOLLY_PAN;break;case Xi.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=te.TOUCH_DOLLY_ROTATE;break;default:this.state=te.NONE}break;default:this.state=te.NONE}this.state!==te.NONE&&this.dispatchEvent(Ya)}function e_(i){switch(this._trackPointer(i),this.state){case te.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case te.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case te.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case te.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=te.NONE}}function n_(i){this.enabled!==!1&&i.preventDefault()}function i_(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.ownerDocument.addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function s_(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.ownerDocument.removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function Un(i){let t=i>>>0;return function(){t|=0,t=t+1831565813|0;let n=Math.imul(t^t>>>15,1|t);return n=n+Math.imul(n^n>>>7,61|n)^n,((n^n>>>14)>>>0)/4294967296}}function ze(i,t){const e=document.createElement("canvas");return e.width=i,e.height=t,{canvas:e,ctx:e.getContext("2d")}}function qn(i,t,e,n,s){const r=[0],o=[0];t<n&&r.push(i),t>i-n&&r.push(-i),e<n&&o.push(i),e>i-n&&o.push(-i);for(const a of r)for(const l of o)s(t+a,e+l)}function on(i,{repeatX:t=1,repeatY:e=1,srgb:n=!0}={}){const s=new Br(i);return s.wrapS=Es,s.wrapT=Es,s.repeat.set(t,e),n&&(s.colorSpace=ke),s.anisotropy=8,s.needsUpdate=!0,s}function r_(){const t=Un(104729),{canvas:e,ctx:n}=ze(1024,1024),{canvas:s,ctx:r}=ze(1024,1024);n.fillStyle="#926c4b",n.fillRect(0,0,1024,1024),r.fillStyle="#808080",r.fillRect(0,0,1024,1024);for(let l=0;l<220;l++){const c=t()*1024,h=t()*1024,u=28+t()*68,d=t()>.48?"rgba(186, 146, 102, 0.10)":"rgba(84, 56, 36, 0.09)";qn(1024,c,h,u,(f,_)=>{const M=n.createRadialGradient(f,_,2,f,_,u);M.addColorStop(0,d),M.addColorStop(1,"rgba(0,0,0,0)"),n.fillStyle=M,n.beginPath(),n.arc(f,_,u,0,Math.PI*2),n.fill()})}const o=[{stroke:"rgba(72, 48, 30, 0.42)",bump:"rgba(54, 54, 54, 0.46)",lw:1.3,segs:[]},{stroke:"rgba(148, 108, 72, 0.40)",bump:"rgba(144, 144, 144, 0.40)",lw:1.15,segs:[]},{stroke:"rgba(188, 148, 106, 0.38)",bump:"rgba(196, 196, 196, 0.42)",lw:1.4,segs:[]},{stroke:"rgba(218, 182, 138, 0.30)",bump:"rgba(232, 232, 232, 0.45)",lw:1.7,segs:[]}],a=15e3;for(let l=0;l<a;l++){const c=t()*1024,h=t()*1024,d=t()>.72?15+t()*20:9+t()*14,f=Math.PI*.5+(t()-.5)*.28,_=Math.cos(f)*d,M=Math.sin(f)*d,p=t(),m=p<.22?0:p<.65?1:p<.88?2:3,x=o[m].segs;qn(1024,c,h,d+2,(y,v)=>{x.push(y,v,y+_,v+M)})}n.lineCap="round",r.lineCap="round";for(const l of o){n.strokeStyle=l.stroke,n.lineWidth=l.lw,n.beginPath();for(let c=0;c<l.segs.length;c+=4)n.moveTo(l.segs[c],l.segs[c+1]),n.lineTo(l.segs[c+2],l.segs[c+3]);n.stroke(),r.strokeStyle=l.bump,r.lineWidth=l.lw,r.beginPath();for(let c=0;c<l.segs.length;c+=4)r.moveTo(l.segs[c],l.segs[c+1]),r.lineTo(l.segs[c+2],l.segs[c+3]);r.stroke()}return{map:on(e,{repeatX:2.5,repeatY:2.5,srgb:!0}),bumpMap:on(s,{repeatX:2.5,repeatY:2.5,srgb:!1})}}function o_(){const t=Un(88421),{canvas:e,ctx:n}=ze(512,512),{canvas:s,ctx:r}=ze(512,512),o=n.createLinearGradient(0,0,0,512);o.addColorStop(0,"#d8c426"),o.addColorStop(.16,"#fbd32c"),o.addColorStop(.68,"#f7c11c"),o.addColorStop(1,"#eaab14"),n.fillStyle=o,n.fillRect(0,0,512,512),r.fillStyle="#929292",r.fillRect(0,0,512,512);for(let a=0;a<95;a++){const l=t()*512,c=t()*512,h=18+t()*52,u=t()>.5?"rgba(255, 242, 138, 0.17)":"rgba(220, 146, 12, 0.12)";qn(512,l,c,h,(d,f)=>{const _=n.createRadialGradient(d,f,2,d,f,h);_.addColorStop(0,u),_.addColorStop(1,"rgba(0,0,0,0)"),n.fillStyle=_,n.beginPath(),n.arc(d,f,h,0,Math.PI*2),n.fill()})}for(let a=0;a<2100;a++){const l=t()*512,c=t()*512,h=1.6+t()*3.1;n.fillStyle="rgba(202, 134, 10, 0.26)",n.beginPath(),n.arc(l,c,h,0,Math.PI*2),n.fill(),n.fillStyle="rgba(255, 246, 166, 0.28)",n.beginPath(),n.arc(l-h*.35,c-h*.35,h*.58,0,Math.PI*2),n.fill();const u=r.createRadialGradient(l,c,.3,l,c,h*1.45);u.addColorStop(0,"rgba(32, 32, 32, 0.85)"),u.addColorStop(.65,"rgba(224, 224, 224, 0.72)"),u.addColorStop(1,"rgba(146, 146, 146, 0)"),r.fillStyle=u,r.beginPath(),r.arc(l,c,h*1.45,0,Math.PI*2),r.fill()}return{map:on(e,{repeatX:1,repeatY:1,srgb:!0}),bumpMap:on(s,{repeatX:1,repeatY:1,srgb:!1})}}function a_(){const t=Un(55103),{canvas:e,ctx:n}=ze(512,512),{canvas:s,ctx:r}=ze(512,512);n.fillStyle="#6c7076",n.fillRect(0,0,512,512),r.fillStyle="#808080",r.fillRect(0,0,512,512);for(let o=0;o<420;o++){const a=t()*512,l=t()*512,c=10+t()*44,h=8+t()*32,u=t()*Math.PI,d=Math.floor(78+t()*76),f=Math.floor((t()-.45)*16),_=`rgba(${d+f}, ${d+Math.floor(f*.55)}, ${d+4}, 0.22)`,M=Math.floor(38+t()*180),p=`rgba(${M}, ${M}, ${M}, 0.24)`;qn(512,a,l,Math.max(c,h)+4,(m,x)=>{n.fillStyle=_,n.save(),n.translate(m,x),n.rotate(u),n.beginPath(),n.ellipse(0,0,c,h,0,0,Math.PI*2),n.fill(),n.restore(),r.fillStyle=p,r.beginPath(),r.arc(m,x,c*.65,0,Math.PI*2),r.fill()})}for(let o=0;o<36;o++){const a=t()*512,l=t()*512,c=28+t()*64,h=t()*Math.PI*2,u=a+Math.cos(h)*c*.5+(t()-.5)*16,d=l+Math.sin(h)*c*.5+(t()-.5)*16,f=a+Math.cos(h)*c,_=l+Math.sin(h)*c;qn(512,a,l,c+12,(M,p)=>{const m=M-a,x=p-l;n.strokeStyle="rgba(34, 38, 42, 0.26)",n.lineWidth=1.2+t()*1.4,n.beginPath(),n.moveTo(M,p),n.quadraticCurveTo(u+m,d+x,f+m,_+x),n.stroke(),r.strokeStyle="rgba(26, 26, 26, 0.45)",r.lineWidth=1.6+t()*1.5,r.beginPath(),r.moveTo(M,p),r.quadraticCurveTo(u+m,d+x,f+m,_+x),r.stroke()})}for(let o=0;o<110;o++){const a=t()*512,l=t()*512,c=5+t()*16,h=t()>.35?"rgba(78, 102, 66, 0.18)":"rgba(156, 152, 144, 0.16)";qn(512,a,l,c,(u,d)=>{n.fillStyle=h,n.beginPath(),n.arc(u,d,c,0,Math.PI*2),n.fill()})}for(let o=0;o<4200;o++){const a=t()*512,l=t()*512,c=t()>.5?225:36;n.fillStyle=`rgba(${c}, ${c}, ${c}, 0.08)`,n.fillRect(a,l,2,2),r.fillStyle=`rgba(${c}, ${c}, ${c}, 0.15)`,r.fillRect(a,l,2,2)}return{map:on(e,{repeatX:2,repeatY:2,srgb:!0}),bumpMap:on(s,{repeatX:2,repeatY:2,srgb:!1})}}function l_(){const t=Un(77211),{canvas:e,ctx:n}=ze(512,512),{canvas:s,ctx:r}=ze(512,512);n.fillStyle="#cca474",n.fillRect(0,0,512,512),r.fillStyle="#808080",r.fillRect(0,0,512,512);for(let o=0;o<512;o+=2){const a=Math.sin(o/512*Math.PI*6)*8+Math.sin(o/512*Math.PI*2)*12,l=Math.floor(188+Math.sin((o+a)*.24)*18+(t()-.5)*10);n.fillStyle=`rgb(${l+14}, ${Math.floor(l*.79)}, ${Math.floor(l*.53)})`,n.fillRect(0,o,512,2);const c=Math.floor(128+Math.sin((o+a)*.24)*30);r.fillStyle=`rgb(${c}, ${c}, ${c})`,r.fillRect(0,o,512,2)}for(let o=0;o<420;o++){const a=t()*512;n.strokeStyle=t()>.5?"rgba(110, 74, 42, 0.22)":"rgba(236, 206, 158, 0.18)",n.lineWidth=.7+t()*1.2,n.beginPath(),n.moveTo(0,a),n.bezierCurveTo(512*.33,a+(t()-.5)*7,512*.66,a+(t()-.5)*7,512,a),n.stroke()}return{map:on(e,{repeatX:1,repeatY:1,srgb:!0}),bumpMap:on(s,{repeatX:1,repeatY:1,srgb:!1})}}function Sc(i="dry"){const n=Un(i==="dry"?3091:9031),{canvas:s,ctx:r}=ze(128,512),o=r.createLinearGradient(0,0,128,0);i==="green"?(o.addColorStop(0,"#446a38"),o.addColorStop(.5,"#618c4d"),o.addColorStop(1,"#446a38")):(o.addColorStop(0,"#a28755"),o.addColorStop(.5,"#c6ae76"),o.addColorStop(1,"#a28755")),r.fillStyle=o,r.fillRect(0,0,128,512);for(let l=0;l<240;l++){const c=n()*128;r.strokeStyle=i==="green"?n()>.5?"rgba(38, 62, 30, 0.24)":"rgba(140, 174, 102, 0.2)":n()>.5?"rgba(104, 82, 46, 0.22)":"rgba(224, 204, 152, 0.2)",r.lineWidth=.8+n()*1.1,r.beginPath(),r.moveTo(c,0),r.lineTo(c,512),r.stroke()}const a=[512*.22,512*.52,512*.82];for(const l of a)r.fillStyle=i==="green"?"rgba(34, 52, 26, 0.65)":"rgba(84, 64, 34, 0.65)",r.fillRect(0,l-4,128,5),r.fillStyle=i==="green"?"rgba(168, 192, 128, 0.55)":"rgba(232, 214, 168, 0.55)",r.fillRect(0,l+1,128,3);return on(s,{repeatX:1,repeatY:1,srgb:!0})}function c_(){const t=Un(202611),{canvas:e,ctx:n}=ze(512,512),{canvas:s,ctx:r}=ze(512,512);n.fillStyle="#f5f8fd",n.fillRect(0,0,512,512),r.fillStyle="#808080",r.fillRect(0,0,512,512);for(let o=0;o<160;o++){const a=t()*512,l=t()*512,c=24+t()*64,h=t()>.5,u=h?"rgba(255, 255, 255, 0.16)":"rgba(216, 229, 246, 0.13)",d=h?170:92,f=`rgba(${d}, ${d}, ${d}, 0.16)`;qn(512,a,l,c,(_,M)=>{const p=n.createRadialGradient(_,M,2,_,M,c);p.addColorStop(0,u),p.addColorStop(1,"rgba(0,0,0,0)"),n.fillStyle=p,n.beginPath(),n.arc(_,M,c,0,Math.PI*2),n.fill();const m=r.createRadialGradient(_,M,2,_,M,c);m.addColorStop(0,f),m.addColorStop(1,"rgba(128, 128, 128, 0)"),r.fillStyle=m,r.beginPath(),r.arc(_,M,c,0,Math.PI*2),r.fill()})}for(let o=0;o<5400;o++){const a=t()*512,l=t()*512,c=t()>.86?255:t()>.5?160:98;r.fillStyle=`rgba(${c}, ${c}, ${c}, 0.24)`,r.fillRect(a,l,1.5,1.5)}return{map:on(e,{repeatX:2.5,repeatY:2.5,srgb:!0}),bumpMap:on(s,{repeatX:4,repeatY:4,srgb:!1})}}function h_(){const t=Un(99231),{canvas:e,ctx:n}=ze(512,512),{canvas:s,ctx:r}=ze(512,512);n.fillStyle="#1f3e26",n.fillRect(0,0,512,512),r.fillStyle="#686868",r.fillRect(0,0,512,512);const o=[{col:"rgba(20, 44, 24, 0.72)",bCol:"rgba(40,40,40,0.55)",lw:1.8,segs:[]},{col:"rgba(42, 78, 44, 0.65)",bCol:"rgba(180,180,180,0.48)",lw:1.7,segs:[]},{col:"rgba(62, 102, 56, 0.55)",bCol:"rgba(215,215,215,0.5)",lw:1.6,segs:[]},{col:"rgba(182, 206, 194, 0.28)",bCol:"rgba(235,235,235,0.5)",lw:1.5,segs:[]}];for(let a=0;a<5200;a++){const l=t()*512,c=t()*512,h=10+t()*18,u=t()*Math.PI*2,d=Math.cos(u)*h,f=Math.sin(u)*h,_=t(),M=_<.3?0:_<.75?1:_<.93?2:3,p=o[M].segs;qn(512,l,c,h+2,(m,x)=>{p.push(m,x,m+d,x+f)})}for(const a of o){n.strokeStyle=a.col,n.lineWidth=a.lw,n.beginPath();for(let l=0;l<a.segs.length;l+=4)n.moveTo(a.segs[l],a.segs[l+1]),n.lineTo(a.segs[l+2],a.segs[l+3]);n.stroke(),r.strokeStyle=a.bCol,r.lineWidth=1.4,r.beginPath();for(let l=0;l<a.segs.length;l+=4)r.moveTo(a.segs[l],a.segs[l+1]),r.lineTo(a.segs[l+2],a.segs[l+3]);r.stroke()}return{map:on(e,{repeatX:2,repeatY:2,srgb:!0}),bumpMap:on(s,{repeatX:2,repeatY:2,srgb:!1})}}function u_(){const{canvas:t,ctx:e}=ze(256,256);e.fillStyle="#f6f2e8",e.fillRect(0,0,256,256),e.strokeStyle="rgba(205, 198, 184, 0.35)",e.lineWidth=1;for(let n=0;n<256;n+=4)e.beginPath(),e.moveTo(0,n),e.lineTo(256,n),e.stroke(),e.beginPath(),e.moveTo(n,0),e.lineTo(n,256),e.stroke();e.fillStyle="#2d4b73",e.fillRect(0,14,256,12),e.fillRect(0,230,256,12);for(let n=46;n<216;n+=28)for(let s=16;s<256;s+=28){const r=Math.floor(n/28)%2*14;e.beginPath(),e.arc((s+r)%256,n,4.5,0,Math.PI*2),e.fill()}return on(t,{repeatX:1,repeatY:1,srgb:!0})}function d_(){const t=Un(61803),{canvas:e,ctx:n}=ze(256,256);n.clearRect(0,0,256,256);for(let o=0;o<22;o++){const a=t()*Math.PI*2,l=t()*44,c=256*.5+Math.cos(a)*l,h=256*.5+Math.sin(a)*l,u=40+t()*46,d=n.createRadialGradient(c,h,4,c,h,u);d.addColorStop(0,"rgba(255, 255, 255, 0.25)"),d.addColorStop(.5,"rgba(246, 250, 255, 0.11)"),d.addColorStop(1,"rgba(255, 255, 255, 0)"),n.fillStyle=d,n.beginPath(),n.arc(c,h,u,0,Math.PI*2),n.fill()}n.globalCompositeOperation="destination-in";const s=n.createRadialGradient(256/2,256/2,256*.06,256/2,256/2,256*.48);s.addColorStop(0,"rgba(255, 255, 255, 1)"),s.addColorStop(.62,"rgba(255, 255, 255, 0.65)"),s.addColorStop(1,"rgba(255, 255, 255, 0)"),n.fillStyle=s,n.fillRect(0,0,256,256);const r=new Br(e);return r.colorSpace=ke,r.needsUpdate=!0,r}function f_(){const t=Un(7331),{canvas:e,ctx:n}=ze(256,256);n.clearRect(0,0,256,256);const s=256/2,r=256/2,o=n.createRadialGradient(s,r,4,s,r,256*.42);o.addColorStop(0,"rgba(248, 254, 255, 0.85)"),o.addColorStop(.35,"rgba(232, 249, 252, 0.48)"),o.addColorStop(.7,"rgba(220, 246, 250, 0.12)"),o.addColorStop(1,"rgba(220, 246, 250, 0)"),n.fillStyle=o,n.fillRect(0,0,256,256);for(let l=0;l<64;l++){const c=t()*Math.PI*2,h=Math.pow(t(),.72)*256*.36,u=3+t()*11,d=s+Math.cos(c)*h,f=r+Math.sin(c)*h,_=n.createRadialGradient(d,f,1,d,f,u);_.addColorStop(0,"rgba(255, 255, 255, 0.65)"),_.addColorStop(.65,"rgba(236, 252, 255, 0.25)"),_.addColorStop(1,"rgba(255, 255, 255, 0)"),n.fillStyle=_,n.beginPath(),n.arc(d,f,u,0,Math.PI*2),n.fill()}const a=new Br(e);return a.colorSpace=ke,a.needsUpdate=!0,a}function p_(){const{canvas:t,ctx:e}=ze(64,64),n=e.createRadialGradient(64/2,64/2,1.5,64/2,64/2,64*.48);n.addColorStop(0,"rgba(255, 255, 255, 1.0)"),n.addColorStop(.42,"rgba(246, 251, 255, 0.88)"),n.addColorStop(.74,"rgba(225, 238, 255, 0.26)"),n.addColorStop(1,"rgba(220, 235, 255, 0)"),e.fillStyle=n,e.fillRect(0,0,64,64);const s=new Br(t);return s.colorSpace=ke,s.needsUpdate=!0,s}function m_(){const t=Un(41123),{canvas:e,ctx:n}=ze(256,256);n.fillStyle="#4f3f34",n.fillRect(0,0,256,256);for(let s=0;s<380;s++){const r=t()*256,o=t()*256,a=3+t()*9,l=14+t()*38,c=t()>.45?"rgba(38, 28, 22, 0.56)":"rgba(112, 92, 76, 0.44)";qn(256,r,o,Math.max(a,l),(h,u)=>{n.fillStyle=c,n.fillRect(h,u,a,l)})}return on(e,{repeatX:2,repeatY:4,srgb:!0})}const Vn=0,Ir=0,Nr=.2,xa=2.6,va=2.1;function Ma(i){return 5.65-Math.max(0,Math.sin(i))*.55+.28*Math.sin(i*3+.4)+.18*Math.cos(i*5-.8)+.12*Math.sin(i*2-1.2)}function Ph(i,t){const e=i-Ir,n=t-Nr,s=Math.atan2(n,e),r=1+.075*Math.sin(s*2+.6)+.045*Math.cos(s*3-.9)+.025*Math.sin(s*5+.3),o=e/(xa*r),a=n/(va*r);return Math.sqrt(o*o+a*a)}function Mi(i,t,e){const n=Math.max(0,Math.min(1,(e-i)/(t-i)));return n*n*(3-2*n)}function pn(i,t){const e=Ph(i,t),n=Math.hypot(i,t),s=Math.atan2(t,i),r=Ma(s),o=n/r,a=Mi(2.4,-4.8,t)*.54,l=.15*Math.sin(i*.66+.5)*Math.cos(t*.58-.3)+.09*Math.cos((i-t)*.52)+.06*Math.sin(i*1.3+t*.98),c=Math.hypot((i-2.08)/1.45,(t-1.78)/1.18),h=(1-Mi(.55,1.32,c))*-.14,u=Mi(.84,1.02,o)*-.24,d=.34+a+l+h+u;if(e<1.22){const f=Mi(.76,1.18,e);return(-.96+.14*Math.exp(-((i*i+(t-.05)*(t-.05))/2.2)))*(1-f)+d*f}return d}function g_(i){const t=new ee;t.name="DioramaIsland";const e=56,n=116,s=[],r=[],o=[],a=[],l=new wt("#f6f9ff"),c=new wt("#dce8f7"),h=new wt("#464c52"),u=new wt("#27373e"),d=new wt,f=pn(0,0);s.push(0,f,0),r.push(.5,.5),o.push(u.r,u.g,u.b);for(let B=1;B<=e;B++){const z=B/e,nt=Math.pow(z,.92);for(let H=0;H<=n;H++){const Q=H/n*Math.PI*2,it=Ma(Q),_t=nt*it,bt=Math.cos(Q)*_t,K=Math.sin(Q)*_t,lt=pn(bt,K);s.push(bt,lt,K),r.push(bt*.15+.5,K*.15+.5);const St=Ph(bt,K);if(St<.88){const Tt=Mi(-1,-.25,lt);d.copy(u).lerp(h,Tt*.65)}else if(St<1.12){const Tt=Mi(.88,1.12,St);d.copy(h).lerp(c,Tt)}else{const Tt=Mi(.22,.72,lt);d.copy(c).lerp(l,.45+Tt*.55)}o.push(d.r,d.g,d.b)}}const _=n+1;for(let B=0;B<n;B++)a.push(0,1+B+1,1+B);for(let B=1;B<e;B++){const z=1+(B-1)*_,nt=1+B*_;for(let H=0;H<n;H++){const Q=z+H,it=z+H+1,_t=nt+H,bt=nt+H+1;a.push(Q,bt,_t),a.push(Q,it,bt)}}const M=new Me;M.setAttribute("position",new Ht(s,3)),M.setAttribute("uv",new Ht(r,2)),M.setAttribute("color",new Ht(o,3)),M.setIndex(a),M.computeVertexNormals();const p=new Xt({vertexColors:!0,map:i.snow.map,bumpMap:i.snow.bumpMap,bumpScale:.032,roughness:.85,metalness:.02}),m=new mt(M,p);m.receiveShadow=!0,m.castShadow=!0,t.add(m);const x=n,y=[{dy:.02,rScale:1.01,color:new wt("#f2f7ff")},{dy:-.17,rScale:1.018,color:new wt("#d2e0f0")},{dy:-.34,rScale:.968,color:new wt("#695443")},{dy:-.78,rScale:.92,color:new wt("#544e4a")},{dy:-1.35,rScale:.78,color:new wt("#3f4046")},{dy:-1.86,rScale:.56,color:new wt("#2d3037")}],v=[],T=[],b=[],g=[];for(let B=0;B<y.length;B++){const z=y[B];for(let nt=0;nt<=x;nt++){const H=nt/x*Math.PI*2,Q=Ma(H),it=Math.cos(H)*Q,_t=Math.sin(H)*Q,bt=pn(it,_t),K=B>=2?(.13*Math.sin(H*11+B*1.7)+.08*Math.cos(H*19-B*2.1))*(B===y.length-1?.5:1):.03*Math.sin(H*9),lt=Q*z.rScale+K,St=B<=1?bt+z.dy:Math.min(bt+z.dy,-.12+z.dy*.85);v.push(Math.cos(H)*lt,St,Math.sin(H)*lt),T.push(nt/x*8,B/(y.length-1));const Tt=1+.07*Math.sin(H*13+B*3);b.push(Math.min(1,z.color.r*Tt),Math.min(1,z.color.g*Tt),Math.min(1,z.color.b*Tt))}}const w=x+1;for(let B=0;B<y.length-1;B++){const z=B*w,nt=(B+1)*w;for(let H=0;H<x;H++){const Q=z+H,it=z+H+1,_t=nt+H,bt=nt+H+1;g.push(Q,_t,bt),g.push(Q,bt,it)}}const P=v.length/3;v.push(0,-2.06,0),T.push(.5,1),b.push(.14,.16,.2);const C=(y.length-1)*w;for(let B=0;B<x;B++)g.push(C+B,P,C+B+1);const D=new Me;D.setAttribute("position",new Ht(v,3)),D.setAttribute("uv",new Ht(T,2)),D.setAttribute("color",new Ht(b,3)),D.setIndex(g),D.computeVertexNormals();const F=new Xt({vertexColors:!0,map:i.rock.map,bumpMap:i.rock.bumpMap,bumpScale:.07,roughness:.9,metalness:.04}),U=new mt(D,F);U.receiveShadow=!0,U.castShadow=!0,t.add(U);const L=[{x:4.18,z:2.98,rx:.42,rz:.32,rot:.42},{x:3.55,z:2.58,rx:.37,rz:.3,rot:-.28},{x:2.92,z:2.24,rx:.4,rz:.32,rot:.62}],V=new Xt({color:"#73787f",map:i.rock.map,bumpMap:i.rock.bumpMap,bumpScale:.045,roughness:.86});for(const B of L){const z=new Ze(B.rx*.88,B.rx*1.04,.18,20),nt=z.attributes.position;for(let it=0;it<nt.count;it++){const _t=nt.getX(it),bt=nt.getZ(it),K=Math.atan2(bt,_t),lt=1+.08*Math.sin(K*3+B.rot)+.05*Math.cos(K*5);nt.setX(it,_t*lt),nt.setZ(it,bt*lt*(B.rz/B.rx))}z.computeVertexNormals();const H=new mt(z,V),Q=pn(B.x,B.z);H.position.set(B.x,Q-.025,B.z),H.rotation.y=B.rot,H.receiveShadow=!0,H.castShadow=!0,t.add(H)}return t}function __(){const i=new Le(68,40,28),t={uZenithColor:{value:new wt("#131e36")},uMidColor:{value:new wt("#2c3f63")},uHorizonColor:{value:new wt("#7a6b7e")},uGroundColor:{value:new wt("#182133")},uStarIntensity:{value:.45},uMoonIntensity:{value:.35},uMoonDir:{value:new R(-.46,.42,-.78).normalize()},uTime:{value:0}},e=new bn({side:Je,depthWrite:!1,uniforms:t,vertexShader:`
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,fragmentShader:`
      uniform vec3 uZenithColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uGroundColor;
      uniform float uStarIntensity;
      uniform float uMoonIntensity;
      uniform vec3 uMoonDir;
      uniform float uTime;
      varying vec3 vWorldDir;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      vec2 hash22(vec2 p) {
        float n = hash21(p);
        return vec2(n, hash21(p + n * 19.7));
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = dir.y;

        vec3 col;
        if (h >= 0.0) {
          float t1 = smoothstep(0.0, 0.28, h);
          float t2 = smoothstep(0.2, 0.85, h);
          col = mix(uHorizonColor, uMidColor, t1);
          col = mix(col, uZenithColor, t2);
        } else {
          float tb = smoothstep(0.0, -0.35, h);
          col = mix(uHorizonColor * 0.72, uGroundColor, tb);
        }

        // Soft distant snowy mountain ridges along the winter horizon
        float az = atan(dir.z, dir.x);
        float ridgeFar = 0.042 + 0.036 * sin(az * 3.0 + 0.7) + 0.019 * sin(az * 7.0 - 1.2) + 0.011 * cos(az * 13.0);
        float ridgeNear = 0.018 + 0.022 * cos(az * 4.0 - 0.5) + 0.012 * sin(az * 9.0 + 1.4);
        float aboveGround = smoothstep(-0.14, 0.005, h);

        float farMask = (1.0 - smoothstep(ridgeFar - 0.008, ridgeFar + 0.014, h)) * aboveGround;
        vec3 farCol = mix(uMidColor * 0.62, uHorizonColor * 0.76, 0.4);
        col = mix(col, farCol, farMask * 0.45);

        float nearMask = (1.0 - smoothstep(ridgeNear - 0.006, ridgeNear + 0.012, h)) * aboveGround;
        vec3 nearCol = mix(uMidColor * 0.45, uHorizonColor * 0.52, 0.25);
        col = mix(col, nearCol, nearMask * 0.52);

        // Crisp circular twinkling winter stars (zero blocky square cells!)
        if (h > 0.06 && uStarIntensity > 0.01) {
          vec2 starUv = vec2(az / 6.2831853 + 0.5, asin(clamp(h, -1.0, 1.0)) / 1.5707963);
          vec2 grid = starUv * vec2(115.0, 52.0);
          vec2 cell = floor(grid);
          vec2 gv = fract(grid) - 0.5;
          float rnd = hash21(cell);
          if (rnd > 0.87) {
            vec2 off = (hash22(cell + 7.1) - 0.5) * 0.62;
            // Aspect-correct by cos(elevation) so stars stay perfectly circular at high latitudes
            float cosLat = max(0.25, sqrt(max(0.0, 1.0 - h * h)));
            vec2 delta = (gv - off) * vec2(cosLat * 2.2, 1.0);
            float d = length(delta);
            float radius = mix(0.045, 0.11, fract(rnd * 37.3));
            float dotStar = smoothstep(radius, radius * 0.15, d);
            float twinkle = 0.65 + 0.35 * sin(uTime * 1.9 + rnd * 95.0);
            float starAlpha = smoothstep(0.06, 0.28, h) * uStarIntensity * twinkle * dotStar;
            vec3 starTint = mix(vec3(0.84, 0.92, 1.0), vec3(1.0, 0.94, 0.84), fract(rnd * 13.7));
            col += starTint * starAlpha * 0.95;
          }
        }

        // Soft winter moon + glowing lunar halo
        if (uMoonIntensity > 0.01) {
          float mDot = dot(dir, normalize(uMoonDir));
          float halo = pow(max(mDot, 0.0), 16.0) * 0.26 + pow(max(mDot, 0.0), 110.0) * 0.45;
          float disc = smoothstep(0.9974, 0.9986, mDot);
          col += vec3(0.94, 0.96, 1.0) * (halo + disc * 0.95) * uMoonIntensity;
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `}),n=new mt(i,e);return n.name="WinterSkyDome",{mesh:n,uniforms:t,update(s){t.uTime.value=s}}}function Sa({radius:i=.19,withLeaf:t=!0,yuzuTextures:e}={}){const n=new ee;n.name="Yuzu";const s=new Le(i,40,28),r=s.attributes.position;for(let M=0;M<r.count;M++){let p=r.getX(M),m=r.getY(M),x=r.getZ(M);const y=Math.hypot(p,m,x)||1,v=p/y,T=m/y,b=x/y,g=T>.82?-.065*Math.pow((T-.82)/.18,2):0,w=T<-.84?-.04*Math.pow((-T-.84)/.16,2):0,P=.017*Math.sin(v*9+b*7)*Math.cos(T*8)+.011*Math.cos(v*14-T*11+b*12),C=1+g+w+P;p*=C*1.06,m*=C*.88,x*=C*1.06,r.setXYZ(M,p,m,x)}s.computeVertexNormals();const o=new Xt({color:"#ffffff",map:e.map,bumpMap:e.bumpMap,bumpScale:.022,roughness:.4,metalness:.02}),a=new mt(s,o);a.castShadow=!0,a.receiveShadow=!0,n.add(a);const l=i*.815,c=new Xt({color:"#3a5822",roughness:.72}),h=new mt(new Ze(i*.15,i*.18,i*.08,7),c);h.position.y=l,n.add(h);for(let M=0;M<5;M++){const p=M/5*Math.PI*2,m=new mt(new vi(i*.085,i*.24,4),c);m.position.set(Math.cos(p)*i*.13,l-i*.01,Math.sin(p)*i*.13),m.rotation.z=-Math.PI*.44,m.rotation.y=-p,n.add(m)}const u=new nn([new R(0,l+i*.02,0),new R(i*.04,l+i*.21,i*.02),new R(i*.09,l+i*.33,-i*.02)]),d=new He(u,6,i*.048,6,!1),f=new Xt({color:"#5c4727",roughness:.85}),_=new mt(d,f);if(_.castShadow=!0,n.add(_),t){const M=y=>{const v=new Va;v.moveTo(0,0),v.bezierCurveTo(y*.26,y*.29,y*.68,y*.27,y,0),v.bezierCurveTo(y*.68,-y*.27,y*.26,-y*.29,0,0);const T=new Gr(v,12),b=T.attributes.position;for(let g=0;g<b.count;g++){const w=b.getX(g),P=b.getY(g),C=w/y,D=Math.sin(C*Math.PI*.88)*y*.19-Math.abs(P)*.18;b.setZ(g,D)}return T.computeVertexNormals(),T},p=new Xt({color:"#347c2b",roughness:.32,metalness:.04,side:sn}),m=new mt(M(i*1.24),p);m.position.set(i*.04,l+i*.2,0),m.rotation.set(-Math.PI*.35,.45,.28),m.castShadow=!0,n.add(m);const x=new mt(M(i*.72),p);x.position.set(i*.02,l+i*.22,-i*.01),x.rotation.set(-Math.PI*.38,2.35,.22),x.castShadow=!0,n.add(x)}return n}function qa(i,t,e){const n=Math.max(0,e),s=Math.max(0,-e),r=e>=0?Math.pow(n,.8)*.72:-s*.48,o=Ae.smoothstep(r,-.1,.42),a=Math.abs(i),l=Math.abs(t),c=Math.hypot(i,t)||1,h=Math.pow(Math.pow(a,3.8)+Math.pow(l,3.8),1/3.8)||1,u=1+o*(c/h-1)*.7,d=.375-.105*Ae.smoothstep(r,-.02,.64)+.024*Math.exp(-Math.pow((r+.12)/.24,2)),f=1-.1*Ae.smoothstep(r,.58,.72),_=i*u*d*f,M=.34-.085*Ae.smoothstep(r,.02,.66)-.024*Math.pow(s,1.5),p=.305-.078*Ae.smoothstep(r,.14,.66)+.026*Math.exp(-Math.pow((r+.08)/.24,2));let m=t>=0?t*u*M:t*u*p;if(t>.4&&r>-.25&&r<.6){const v=Ae.smoothstep(t,.4,.88)*(1-Math.abs(i)*.52),T=.326-.075*Ae.smoothstep(r,0,.64);m=Ae.lerp(m,T,v*.62)}const x=Math.hypot(_,r+.02);t>.62&&x<.21&&(m-=(1-x/.21)*.015);let y=r;return y>.61&&(y=.61+(y-.61)*.42),new R(_,m,y)}function x_(){const i=new Le(1,64,48),t=i.attributes.position,e=i.attributes.uv,n=new Float32Array(t.count*3),s=new wt("#ffffff"),r=new wt("#6a513e"),o=new wt("#473324"),a=new wt("#ffeedc"),l=new wt("#8a7059"),c=new wt;for(let h=0;h<t.count;h++){const u=t.getX(h),d=t.getY(h),f=t.getZ(h),_=qa(u,d,f);t.setXYZ(h,_.x,_.y,_.z);const M=Math.atan2(u,f);e.setXY(h,M/(Math.PI*2)+.5,.5-d*.48);const p=Math.hypot(_.x,_.z+.02);c.copy(s);const m=Ae.smoothstep(_.z,.28,.64);c.lerp(r,m*.48);const x=Ae.smoothstep(_.z,.55,.655)*(1-Ae.smoothstep(Math.abs(_.x),.14,.24));if(c.lerp(o,x*.62),d<-.06&&Math.abs(u)>.25&&_.z<.35&&c.lerp(a,.26),d>.62&&p<.21){const y=Math.pow(1-p/.21,1.3)*.56;c.lerp(l,y)}n[h*3]=c.r,n[h*3+1]=c.g,n[h*3+2]=c.b}return i.setAttribute("color",new hn(n,3)),e.needsUpdate=!0,i.computeVertexNormals(),i}function v_(){const i=new Le(1,56,40),t=i.attributes.position,e=i.attributes.uv,n=new Float32Array(t.count*3),s=new wt("#ffffff"),r=new wt("#6f5642"),o=new wt("#fff2e4"),a=new wt;for(let l=0;l<t.count;l++){const c=t.getX(l),h=t.getY(l),u=t.getZ(l),d=u>=0?u*.92:u*1.1,f=Ae.smoothstep(-.35,.88,d),_=.64+.065*Math.sin(u*1.4-.45)-.23*Math.pow(f,1.3),M=.53-.12*Math.pow(f,1.35),p=.39*Math.pow(f,1.2)-.04*u*u;let m=h*M+p;h>.38&&d<.25&&(m-=Math.pow(h-.38,2)*.12*(1-f*.75));const x=c*_;t.setXYZ(l,x,m,d),e.setXY(l,x*.65+.5,d*.62+.5);const y=-.06+m,v=1-Ae.smoothstep(y,-.03,.18);a.copy(s).lerp(r,v*.44),h>.4&&v<.25&&a.lerp(o,.14),n[l*3]=a.r,n[l*3+1]=a.g,n[l*3+2]=a.b}return i.setAttribute("color",new hn(n,3)),e.needsUpdate=!0,i.computeVertexNormals(),i}function pr(i,t=.005){const e=i.map(([n,s,r])=>{const o=new R(n,s,r).normalize();return qa(o.x,o.y,o.z).addScaledVector(o,t)});return new nn(e)}function M_(i){const t=new ee;t.name="Capybara",t.position.set(0,-.07,.12),t.rotation.y=.36;const e=new Xt({color:"#ffffff",vertexColors:!0,map:i.fur.map,bumpMap:i.fur.bumpMap,bumpScale:.022,roughness:.91,metalness:.01}),n=new Xt({color:"#efe3d6",map:i.fur.map,bumpMap:i.fur.bumpMap,bumpScale:.02,roughness:.91,metalness:.01}),s=new Xt({color:"#5a3d27",map:i.fur.map,bumpMap:i.fur.bumpMap,bumpScale:.014,roughness:.88}),r=new Xt({color:"#8f675b",roughness:.85}),o=new Xt({color:"#1f130c",roughness:.44,metalness:.04}),a=new Xt({color:"#6d4d35",map:i.fur.map,roughness:.9}),l=new Xt({color:"#674a34",map:i.fur.map,roughness:.88}),c=new ee;t.add(c);const h=new mt(v_(),e);h.position.set(0,0,-.18),h.castShadow=!0,h.receiveShadow=!0,c.add(h);for(const v of[-1,1]){const T=new ee;T.position.set(v*.28,-.09,.42),T.rotation.set(.62,v*-.16,v*.06);const b=new mt(new Oa(.115,.24,8,16),n);b.castShadow=!0,b.receiveShadow=!0,T.add(b);const g=new mt(new Le(.12,14,12),l);g.scale.set(.92,.62,1.24),g.position.set(0,-.18,.05),T.add(g),c.add(T)}const u=new ee;u.position.set(0,.49,.47),u.rotation.x=.04,c.add(u);const d=new mt(x_(),e);d.castShadow=!0,d.receiveShadow=!0,u.add(d);const f=[];for(const v of[-1,1]){const T=new ee;T.position.set(v*.242,.245,-.22),T.rotation.set(-.22,v*.48,v*-.3);const b=new Le(.104,18,14,0,Math.PI*2,0,Math.PI*.82);b.scale(.84,1.04,.56);const g=new mt(b,s);g.position.set(0,.036,0),g.castShadow=!0,T.add(g);const w=new mt(new Le(.068,14,10),r);w.scale.set(.76,.9,.34),w.position.set(0,.032,.034),T.add(w),u.add(T),f.push({pivot:T,side:v,baseRotZ:v*-.3})}const _=[];for(const v of[-1,1]){const T=pr([[v*.84,.395,.21],[v*.815,.418,.31],[v*.78,.412,.39],[v*.745,.382,.46]],.003),b=new He(T,18,.0135,10,!1),g=b.attributes.position,w=b.attributes.uv;for(let F=0;F<g.count;F++){const U=Math.min(1,Math.max(0,w.getX(F))),L=T.getPoint(U),V=Math.pow(Math.sin(U*Math.PI),.45);g.setXYZ(F,L.x+(g.getX(F)-L.x)*V,L.y+(g.getY(F)-L.y)*V,L.z+(g.getZ(F)-L.z)*V)}b.computeVertexNormals();const P=new mt(b,o);u.add(P);const C=pr([[v*.835,.345,.24],[v*.805,.352,.33],[v*.765,.34,.42]],.001),D=new mt(new He(C,10,.004,6,!1),a);u.add(D),_.push({eyeSlit:P})}for(const v of[-1,1]){const T=new R(v*.29,.12,.95).normalize(),b=qa(T.x,T.y,T.z).addScaledVector(T,.002),g=new mt(new Le(.015,12,10),o);g.scale.set(1.3,.62,.4),g.position.copy(b),g.rotation.set(.08,v*.32,v*-.28),u.add(g)}const M=pr([[0,.03,1],[0,-.22,.98]],.003);u.add(new mt(new He(M,6,.0075,6,!1),o));const p=pr([[-.4,-.27,.87],[-.2,-.32,.93],[0,-.22,.98],[.2,-.32,.93],[.4,-.27,.87]],.003);u.add(new mt(new He(p,20,.0075,6,!1),o));const m=new Pr({color:"#2b1e16"});for(const v of[-1,1]){const T=[{y:-.004,z:.54,len:.14,droop:-.016},{y:-.036,z:.52,len:.165,droop:-.026},{y:-.068,z:.49,len:.145,droop:-.034}];for(const b of T){const g=new nn([new R(v*.222,b.y,b.z),new R(v*(.222+b.len*.55),b.y+b.droop*.35,b.z-.02),new R(v*(.222+b.len),b.y+b.droop,b.z-.06)]);u.add(new mt(new He(g,6,.0026,4,!1),m))}}const x=new ee;x.position.set(0,.456,-.02),x.rotation.set(.04,.24,-.03);const y=Sa({radius:.195,withLeaf:!0,yuzuTextures:i.yuzu});return x.add(y),u.add(x),{group:t,worldPos:t.position,update(v){const T=Math.sin(v*1.15),b=Math.sin(v*.52);c.position.y=T*.02,c.rotation.z=b*.014,c.rotation.x=Math.sin(v*.85)*.009,u.rotation.x=.04+Math.sin(v*1.15-.45)*.022,u.rotation.y=Math.sin(v*.42)*.038,x.rotation.z=-.03-b*.015,x.rotation.x=.04-Math.sin(v*1.15-.8)*.01;const g=v%7.2,w=g>6.3&&g<6.95?Math.sin((g-6.3)/.65*Math.PI)*.18:0;for(const D of _)D.eyeSlit.scale.y=1-w;const P=v%9.5,C=P>8.6&&P<9?Math.sin((P-8.6)/.4*Math.PI*2)*.13:0;for(const D of f)D.pivot.rotation.z=D.baseRotZ+(D.side>0?C:C*.35)+Math.sin(v*.7)*.02}}}function S_(i){let t=i>>>0;return()=>(t=t*1664525+1013904223>>>0,t/4294967296)}function y_(i,t=.45){const e=i.attributes.position,n=i.attributes.uv;for(let s=0;s<e.count;s++)n.setXY(s,e.getX(s)*t+.5,e.getZ(s)*t+.5);n.needsUpdate=!0}function Eo({radiusX:i=.7,radiusY:t=.55,radiusZ:e=.65,seed:n=1,snowCap:s=!0,snowThickness:r=.15,textures:o,worldY:a=.1}){const l=S_(n),c=new ee,h=new Le(1,32,22),u=h.attributes.position,d=new Float32Array(u.count*3),f=l()*6.28,_=l()*6.28,M=l()*6.28,p=new wt("#7f8389"),m=new wt("#3c434c"),x=new wt("#5a6f52"),y=new wt;function v(g,w,P){const C=Math.sin(g*2.5+f)*Math.cos(w*2.3+_)*Math.sin(P*2.7+M),D=Math.cos(g*4.6-P*4.2+_)*.38;return 1+C*.14+D*.055}for(let g=0;g<u.count;g++){const w=u.getX(g),P=u.getY(g),C=u.getZ(g),D=v(w,P,C),F=w*i*D;let U=P*t*D;const L=C*e*D;U<-t*.48&&(U=-t*.48+(U+t*.48)*.35),U>t*.56&&(U=t*.56+(U-t*.56)*.52),u.setXYZ(g,F,U,L);const V=a+U,B=1-Ae.smoothstep(V,-.05,.24);y.copy(p).lerp(m,B*.72),P>.04&&D>1.05&&y.lerp(x,.3),d[g*3]=y.r,d[g*3+1]=y.g,d[g*3+2]=y.b}h.setAttribute("color",new hn(d,3)),h.computeVertexNormals();const T=new Xt({vertexColors:!0,map:o.rock.map,bumpMap:o.rock.bumpMap,bumpScale:.055,roughness:.84,metalness:.04}),b=new mt(h,T);if(b.castShadow=!0,b.receiveShadow=!0,c.add(b),s){const g=new Le(1,32,18),w=g.attributes.position;for(let D=0;D<w.count;D++){const F=w.getX(D),U=w.getY(D),L=w.getZ(D),V=v(F,Math.max(.28,U),L),B=Math.atan2(L,F),z=1+.06*Math.sin(B*4+f)+.03*Math.cos(B*7-_),nt=U<0?1+Math.sin(Math.min(1,-U)*Math.PI)*.04:1,H=F*i*.88*V*z*nt,Q=L*e*.88*V*z*nt,it=t*.54*V,_t=U>=0?it+Math.pow(U,.72)*(r+t*.24):it+U*(t*.24);w.setXYZ(D,H,_t,Q)}y_(g,.52),g.computeVertexNormals();const P=new Xt({color:"#f6f9ff",map:o.snow.map,bumpMap:o.snow.bumpMap,bumpScale:.022,roughness:.85,metalness:.01}),C=new mt(g,P);C.castShadow=!0,C.receiveShadow=!0,c.add(C)}return c}function w_(i){const t=new ee;t.name="Onsen",[{a:-2.48,rx:.86,ry:.7,rz:.8,rOff:.08,y:.24,snow:!0},{a:-2.02,rx:.84,ry:.6,rz:.74,rOff:.22,y:.22,snow:!0},{a:-1.58,rx:.88,ry:.68,rz:.78,rOff:.08,y:.24,snow:!0},{a:-1.18,rx:.84,ry:.63,rz:.74,rOff:.06,y:.2,snow:!0},{a:-.78,rx:.8,ry:.56,rz:.72,rOff:.06,y:.18,snow:!0},{a:-.4,rx:.74,ry:.5,rz:.68,rOff:.06,y:.14,snow:!0},{a:-.04,rx:.68,ry:.44,rz:.62,rOff:.04,y:.12,snow:!0},{a:.28,rx:.68,ry:.34,rz:.58,rOff:-.05,y:.12,snow:!1},{a:1.24,rx:.66,ry:.32,rz:.55,rOff:.02,y:.06,snow:!0},{a:1.62,rx:.74,ry:.3,rz:.56,rOff:.04,y:.04,snow:!0},{a:2.02,rx:.7,ry:.34,rz:.6,rOff:.05,y:.06,snow:!0},{a:2.42,rx:.76,ry:.44,rz:.66,rOff:.06,y:.1,snow:!0},{a:2.82,rx:.8,ry:.5,rz:.72,rOff:.06,y:.14,snow:!0},{a:-3.02,rx:.82,ry:.58,rz:.74,rOff:.08,y:.18,snow:!0},{a:-2.74,rx:.84,ry:.64,rz:.76,rOff:.08,y:.22,snow:!0}].forEach((N,J)=>{const st=1+.075*Math.sin(N.a*2+.6)+.045*Math.cos(N.a*3-.9)+.025*Math.sin(N.a*5+.3),X=Ir+Math.cos(N.a)*(xa*st+N.rOff),$=Nr+Math.sin(N.a)*(va*st+N.rOff),dt=Eo({radiusX:N.rx,radiusY:N.ry,radiusZ:N.rz,seed:100+J*37,snowCap:N.snow,snowThickness:.12+J%3*.02,textures:i,worldY:N.y});dt.position.set(X,N.y,$),dt.rotation.y=-N.a+(J%2===0?.35:-.4),t.add(dt)});const n=[{x:-2.8,y:.56,z:-1.96,rx:.92,ry:.8,rz:.8,seed:801},{x:-1.82,y:.62,z:-2.44,rx:.95,ry:.82,rz:.82,seed:802},{x:2.8,y:.28,z:-.9,rx:.7,ry:.46,rz:.64,seed:803}];for(const N of n){const J=Eo({radiusX:N.rx,radiusY:N.ry,radiusZ:N.rz,seed:N.seed,snowCap:!0,snowThickness:.14,textures:i,worldY:N.y});J.position.set(N.x,N.y,N.z),t.add(J)}const s=[{x:0,y:-.58,z:.05,rx:.95,ry:.28,rz:.85,seed:901},{x:1.05,y:-.68,z:.82,rx:.62,ry:.25,rz:.55,seed:902},{x:-1.08,y:-.74,z:-.52,rx:.65,ry:.24,rz:.58,seed:903},{x:-.82,y:-.76,z:1.02,rx:.55,ry:.22,rz:.48,seed:904}];for(const N of s){const J=Eo({radiusX:N.rx,radiusY:N.ry,radiusZ:N.rz,seed:N.seed,snowCap:!1,textures:i,worldY:N.y});J.position.set(N.x,N.y,N.z),t.add(J)}const r=new za(1,96);r.rotateX(-Math.PI/2);const o=r.attributes.position;for(let N=0;N<o.count;N++){const J=o.getX(N),st=o.getZ(N),X=Math.atan2(st,J),$=1+.075*Math.sin(X*2+.6)+.045*Math.cos(X*3-.9)+.025*Math.sin(X*5+.3);o.setXYZ(N,J*xa*1.12*$,0,st*va*1.12*$)}r.computeVertexNormals();const a=new ot(-1.12,-.76),l={uTime:{value:0},uDeepColor:{value:new wt("#3b8a88")},uShallowColor:{value:new wt("#86d1cc")},uSkyReflect:{value:new wt("#4d6a94")},uWarmGlowPos:{value:new R(-3.05,1.35,.92)},uWarmGlowColor:{value:new wt("#ffae4a")},uWarmGlowStrength:{value:.95},uSpoutSplash:{value:a},uCapyPos:{value:new ot(0,.12)}},c=new bn({transparent:!0,depthWrite:!1,uniforms:l,vertexShader:`
      uniform float uTime;
      uniform vec2 uSpoutSplash;
      uniform vec2 uCapyPos;
      varying vec3 vWorldPos;
      varying vec2 vLocalXZ;

      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float dSpout = length(wp.xz - uSpoutSplash);
        float dCapy = length(wp.xz - uCapyPos);

        float w1 = sin(dSpout * 14.0 - uTime * 4.4) * exp(-dSpout * 1.05) * 0.017;
        float w2 = sin(dCapy * 8.5 - uTime * 1.9) * exp(-dCapy * 0.72) * 0.008;
        float w3 = sin(wp.x * 2.4 + uTime * 0.9) * cos(wp.z * 2.1 - uTime * 0.75) * 0.006;

        wp.y += w1 + w2 + w3;
        vWorldPos = wp.xyz;
        vLocalXZ = position.xz;

        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,fragmentShader:`
      uniform float uTime;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uSkyReflect;
      uniform vec3 uWarmGlowPos;
      uniform vec3 uWarmGlowColor;
      uniform float uWarmGlowStrength;
      uniform vec2 uSpoutSplash;
      uniform vec2 uCapyPos;

      varying vec3 vWorldPos;
      varying vec2 vLocalXZ;

      float causticPattern(vec2 p, float t) {
        float c = 0.0;
        c += sin(p.x * 3.1 + t * 0.7 + cos(p.y * 2.7 - t * 0.55));
        c += cos(p.y * 3.8 - t * 0.65 + sin(p.x * 2.9 + t * 0.48));
        c += sin((p.x + p.y) * 2.6 + t * 0.85);
        return smoothstep(0.55, 2.35, c * 0.5 + 1.15);
      }

      void main() {
        vec2 p = vWorldPos.xz;
        float dSpout = length(p - uSpoutSplash);
        float dCapy = length(p - uCapyPos);

        float rSpout = cos(dSpout * 14.0 - uTime * 4.4) * exp(-dSpout * 1.05);
        vec2 dirSpout = normalize(p - uSpoutSplash + vec2(0.0001));
        float rCapy = cos(dCapy * 8.5 - uTime * 1.9) * exp(-dCapy * 0.72);
        vec2 dirCapy = normalize(p - uCapyPos + vec2(0.0001));

        vec2 grad =
          dirSpout * rSpout * 0.22 +
          dirCapy * rCapy * 0.09 +
          vec2(
            cos(p.x * 2.6 + uTime * 0.9) * 0.05,
            sin(p.y * 2.4 - uTime * 0.8) * 0.05
          );
        vec3 N = normalize(vec3(-grad.x, 1.0, -grad.y));
        vec3 V = normalize(cameraPosition - vWorldPos);

        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.8);

        float radial = length(vec2(vLocalXZ.x / 2.6, vLocalXZ.y / 2.1));
        float shallowMask = smoothstep(0.38, 1.0, radial);
        vec3 waterCol = mix(uDeepColor, uShallowColor, shallowMask * 0.72);

        float caust = causticPattern(p * 1.18, uTime);
        waterCol += uShallowColor * caust * 0.18;

        waterCol = mix(waterCol, uSkyReflect, clamp(fresnel * 0.56, 0.0, 0.64));

        vec3 L = normalize(uWarmGlowPos - vWorldPos);
        vec3 H = normalize(L + V);
        float distLight = length(uWarmGlowPos - vWorldPos);
        float atten = 1.0 / (1.0 + 0.09 * distLight * distLight);
        float spec = pow(max(dot(N, H), 0.0), 34.0) * 1.35 + pow(max(dot(N, H), 0.0), 6.5) * 0.28;
        waterCol += uWarmGlowColor * spec * atten * uWarmGlowStrength;

        // Soft frothy organic splash ripples & silky concentric ring hugging the capybara
        float splashFoam = exp(-dSpout * 5.8) * 0.72;
        float splashRing1 = smoothstep(0.62, 0.96, sin(dSpout * 18.0 - uTime * 5.2)) * exp(-dSpout * 2.1) * 0.42;
        float splashRing2 = smoothstep(0.7, 0.98, sin(dSpout * 11.5 - uTime * 3.8 + 1.4)) * exp(-dSpout * 1.55) * 0.22;
        float capyRipple = smoothstep(0.56, 0.96, sin(dCapy * 10.5 - uTime * 1.85)) *
                           smoothstep(1.42, 0.72, dCapy) * smoothstep(0.35, 0.65, dCapy) * 0.15;

        waterCol = mix(
          waterCol,
          vec3(0.95, 0.99, 1.0),
          clamp(splashFoam + splashRing1 + splashRing2 + capyRipple, 0.0, 0.84)
        );

        float alpha = clamp(0.78 + fresnel * 0.16 + splashFoam * 0.18 - shallowMask * 0.06, 0.72, 0.94);
        gl_FragColor = vec4(waterCol, alpha);
      }
    `}),h=new mt(r,c);h.position.set(Ir,Vn,Nr),h.renderOrder=2,t.add(h);const u=new ee;u.name="BambooWaterSpout",t.add(u);const d=new Xt({map:i.bambooDry,roughness:.62,metalness:.02}),f=new Xt({color:"#3a2c1a",roughness:.92,side:sn}),_=new Xt({color:"#221d1a",roughness:.95}),M=new Xt({color:"#f5f9ff",map:i.snow.map,roughness:.85}),p=new R(-2.42,1.38,-1.82),m=new R(-1.36,.98,-1),x=new R().subVectors(m,p),y=x.length(),v=new R().addVectors(p,m).multiplyScalar(.5),T=new ee;T.position.copy(v),T.quaternion.setFromUnitVectors(new R(0,1,0),x.clone().normalize());const b=new mt(new Ze(.115,.128,y,16,1,!0),d);b.castShadow=!0,b.receiveShadow=!0,T.add(b);const g=new mt(new Ze(.095,.106,y*.98,14,1,!0),f);T.add(g);for(const N of[-y*.26,y*.16]){const J=new mt(new si(.124,.017,8,18),d);J.rotation.x=Math.PI/2,J.position.y=N,T.add(J)}u.add(T);const w=new nn([p.clone().lerp(m,.14).add(new R(0,.115,0)),p.clone().lerp(m,.44).add(new R(0,.118,0)),p.clone().lerp(m,.72).add(new R(0,.105,0))]),P=new He(w,14,.062,10,!1),C=P.attributes.position,D=P.attributes.uv;for(let N=0;N<C.count;N++){const J=Math.min(1,Math.max(0,D.getX(N))),st=w.getPoint(J);C.setY(N,st.y+(C.getY(N)-st.y)*.62)}P.computeVertexNormals();const F=new mt(P,M);F.castShadow=!0,u.add(F);const U=p.clone().lerp(m,.62);for(const N of[-1,1]){const J=new mt(new Ze(.048,.055,1.32,10),d);J.position.set(U.x+N*.14,U.y-.42,U.z-N*.12),J.rotation.z=N*.34,J.rotation.x=-.16,J.castShadow=!0,u.add(J)}const L=new mt(new si(.15,.024,8,16),_);L.position.copy(U),L.rotation.set(.7,.5,.2),u.add(L);const V=new nn([m.clone().add(new R(.01,-.02,.01)),new R(-1.24,.72,-.88),new R(-1.16,.36,-.8),new R(a.x,Vn-.04,a.y)]),B=new He(V,26,.056,10,!1),z=B.attributes.position,nt=B.attributes.uv;for(let N=0;N<z.count;N++){const J=nt.getX(N),st=V.getPoint(Math.min(1,Math.max(0,J))),X=1-J*.28+Math.sin(J*Math.PI)*.1;z.setXYZ(N,st.x+(z.getX(N)-st.x)*X,st.y+(z.getY(N)-st.y)*X,st.z+(z.getZ(N)-st.z)*X)}B.computeVertexNormals();const H={uTime:{value:0}},Q=new bn({transparent:!0,depthWrite:!1,uniforms:H,vertexShader:`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,fragmentShader:`
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float flow = vUv.x * 6.0 - uTime * 5.8;
        float streaks = 0.55 + 0.45 * sin(flow * 3.2 + sin(vUv.y * 18.0) * 1.4);
        float foam = smoothstep(0.55, 0.95, sin(vUv.x * 16.0 - uTime * 9.0 + vUv.y * 12.0));
        vec3 col = mix(vec3(0.7, 0.93, 0.93), vec3(0.98, 1.0, 1.0), foam * 0.65 + streaks * 0.25);
        float alpha = (0.64 + streaks * 0.24) * smoothstep(0.0, 0.07, vUv.x);
        gl_FragColor = vec4(col, alpha);
      }
    `}),it=new mt(B,Q);it.renderOrder=3,u.add(it);const _t=new ts(.68,.68);_t.rotateX(-Math.PI/2);const bt=new mt(_t,new Pr({map:i.splashFoam,color:"#f2fdff",transparent:!0,opacity:.78,depthWrite:!1}));bt.position.set(a.x,Vn+.014,a.y),bt.renderOrder=3,u.add(bt);const K=new mt(_t,new Pr({map:i.splashFoam,color:"#ffffff",transparent:!0,opacity:.45,depthWrite:!1}));K.position.set(a.x,Vn+.018,a.y),K.scale.setScalar(.66),K.renderOrder=4,u.add(K);const lt=new ee;lt.name="HinokiDeckAndProps",lt.position.set(2.08,.22,1.66),lt.rotation.y=-.62,t.add(lt);const St=new Xt({map:i.hinoki.map,bumpMap:i.hinoki.bumpMap,bumpScale:.02,roughness:.72,metalness:.02}),Tt=new Xt({color:"#916d45",map:i.hinoki.map,roughness:.82}),gt=6,Ft=1.62,oe=1.06;for(let N=0;N<gt;N++){const J=-oe*.5+(N+.5)*(oe/gt),st=new mt(new ln(Ft,.06,oe/gt-.024),St);st.position.set(0,.04,J),st.castShadow=!0,st.receiveShadow=!0,lt.add(st)}for(const N of[-.56,0,.56]){const J=new mt(new ln(.11,.12,oe*.94),Tt);J.position.set(N,-.04,0),J.castShadow=!0,J.receiveShadow=!0,lt.add(J)}const Pt=new ee;Pt.position.set(-.32,.07,.05),lt.add(Pt);const zt=.28,Yt=new mt(new Ze(.24,.21,zt,24,1,!0),St);Yt.position.y=zt*.5,Yt.castShadow=!0,Yt.receiveShadow=!0,Pt.add(Yt);const kt=Tt.clone();kt.side=Je;const me=new mt(new Ze(.222,.194,zt*.98,22,1,!0),kt);me.position.y=zt*.5,Pt.add(me);const ae=new mt(new si(.231,.011,8,24),St);ae.rotation.x=Math.PI/2,ae.position.y=zt,Pt.add(ae);const we=new mt(new Ze(.195,.195,.03,20),Tt);we.position.y=.04,Pt.add(we);const ie=new Xt({color:"#c4834b",roughness:.34,metalness:.78});for(const N of[.08,.21]){const J=Ae.lerp(.212,.242,N/zt),st=new mt(new si(J,.0085,8,28),ie);st.rotation.x=Math.PI/2,st.position.y=N,Pt.add(st)}const Be=new Xt({map:i.tenugui,roughness:.92,side:sn}),de=new nn([new R(.06,.17,.09),new R(.14,.285,.12),new R(.215,.295,.135),new R(.248,.215,.145),new R(.242,.085,.148)]),Re=new ts(.19,.4,10,22),Ce=Re.attributes.position;for(let N=0;N<Ce.count;N++){const J=Ce.getX(N),st=Math.min(1,Math.max(0,(Ce.getY(N)+.2)/.4)),X=de.getPoint(st),$=de.getTangent(st),dt=new R(-$.z,0,$.x).normalize(),I=Math.sin(J*24)*.005;Ce.setXYZ(N,X.x+dt.x*J,X.y+I,X.z+dt.z*J)}Re.computeVertexNormals();const fe=new mt(Re,Be);fe.castShadow=!0,fe.receiveShadow=!0,Pt.add(fe);const k=Sa({radius:.135,withLeaf:!0,yuzuTextures:i.yuzu});k.position.set(.28,.185,.08),k.rotation.set(.18,1.2,-.1),lt.add(k);const ue=new ee;ue.position.set(2.54,.42,.76),ue.rotation.y=-.35,t.add(ue);const ne=new mt(new ln(.46,.032,.34),St);ne.castShadow=!0,ne.receiveShadow=!0,ue.add(ne);for(const N of[-.16,.16]){const J=new mt(new ln(.46,.048,.022),Tt);J.position.set(0,.018,N),ue.add(J)}for(const N of[-.22,.22]){const J=new mt(new ln(.022,.048,.34),Tt);J.position.set(N,.018,0),ue.add(J)}const se=[new ot(0,0),new ot(.068,0),new ot(.088,.065),new ot(.082,.145),new ot(.034,.205),new ot(.032,.255),new ot(.044,.285),new ot(.034,.285)],xt=new Xt({color:"#ebe4d6",roughness:.28,metalness:.04}),ge=new Xt({color:"#324c6b",roughness:.32}),It=new mt(new Lr(se,20),xt);It.position.set(-.08,.016,-.02),It.castShadow=!0,ue.add(It);const Nt=new mt(new si(.084,.006,6,20),ge);Nt.rotation.x=Math.PI/2,Nt.position.set(-.08,.115,-.02),ue.add(Nt);const A=[new ot(0,0),new ot(.036,0),new ot(.056,.062),new ot(.048,.062),new ot(.03,.012)],S=new mt(new Lr(A,16),xt);S.position.set(.11,.016,.04),S.castShadow=!0,ue.add(S);const at=[{x:-1.32,z:.72,r:.165,leaf:!0,phase:.3,speed:1.15},{x:-.9,z:1.36,r:.148,leaf:!1,phase:1.4,speed:1.32},{x:1.3,z:.9,r:.162,leaf:!0,phase:2.5,speed:1.08},{x:1.52,z:-.22,r:.152,leaf:!1,phase:3.7,speed:1.24},{x:.72,z:-1.14,r:.158,leaf:!0,phase:4.8,speed:1.18},{x:-1.64,z:-.08,r:.145,leaf:!1,phase:5.6,speed:1.28},{x:.25,z:1.48,r:.155,leaf:!0,phase:.9,speed:1.12}].map(N=>{const J=Sa({radius:N.r,withLeaf:N.leaf,yuzuTextures:i.yuzu});return J.position.set(N.x,Vn-N.r*.1,N.z),J.rotation.y=N.phase*1.7,t.add(J),{mesh:J,...N}});return{group:t,waterUniforms:l,splashPoint:a,update(N){l.uTime.value=N,H.uTime.value=N;const J=1+Math.sin(N*6.8)*.08+Math.cos(N*10.6)*.05;bt.scale.setScalar(J),bt.rotation.y=N*.65;const st=.66+Math.cos(N*8.4)*.07;K.scale.setScalar(st),K.rotation.y=-N*.95;for(const X of at){const $=Math.sin(N*X.speed+X.phase)*.02;X.mesh.position.y=Vn-X.r*.12+$,X.mesh.position.x=X.x+Math.sin(N*.35+X.phase)*.04,X.mesh.position.z=X.z+Math.cos(N*.29+X.phase)*.04,X.mesh.rotation.x=Math.sin(N*X.speed*.85+X.phase)*.11,X.mesh.rotation.z=Math.cos(N*X.speed*.72+X.phase)*.11,X.mesh.rotation.y+=.002*(X.phase>3?-1:1)}}}}function Sr(i){let t=i>>>0;return()=>(t=t*1664525+1013904223>>>0,t/4294967296)}function Yi(i,t=.45){const e=i.attributes.position,n=i.attributes.uv;for(let s=0;s<e.count;s++)n.setXY(s,e.getX(s)*t+.5,e.getZ(s)*t+.5);n.needsUpdate=!0}function yc({rx:i=.85,ry:t=.34,rz:e=.78,seed:n=1,pineMat:s,snowMat:r}){const o=new ee,a=Sr(n),l=[{x:0,y:.04,z:0,sx:.68,sy:.78,sz:.66,snow:!0},{x:i*.46,y:-.04,z:e*.16,sx:.54,sy:.68,sz:.52,snow:!0},{x:-i*.46,y:-.03,z:-e*.14,sx:.56,sy:.7,sz:.54,snow:!0},{x:i*.16,y:-.05,z:-e*.44,sx:.52,sy:.66,sz:.5,snow:!0},{x:-i*.16,y:-.04,z:e*.44,sx:.52,sy:.66,sz:.52,snow:!0},{x:i*.36,y:-.09,z:-e*.3,sx:.42,sy:.58,sz:.42,snow:!1},{x:-i*.36,y:-.08,z:e*.32,sx:.42,sy:.58,sz:.42,snow:!1},{x:i*.22,y:-t*.34,z:e*.18,sx:.36,sy:.48,sz:.36,snow:!1},{x:-i*.24,y:-t*.32,z:-e*.16,sx:.38,sy:.48,sz:.36,snow:!1}];for(const c of l){const h=a()*6.28,u=new Le(1,22,14),d=u.attributes.position;for(let _=0;_<d.count;_++){let M=d.getX(_),p=d.getY(_),m=d.getZ(_);const x=Math.atan2(m,M),y=1+.11*Math.sin(x*5+h)+.07*Math.cos(M*6.5-m*5.8+h)+.05*Math.sin(p*7+h);M*=i*c.sx*y,p*=t*c.sy*(p<0?.78:.88)*y,m*=e*c.sz*y,d.setXYZ(_,M,p,m)}Yi(u,1.35),u.computeVertexNormals();const f=new mt(u,s);if(f.position.set(c.x,c.y,c.z),f.castShadow=!0,f.receiveShadow=!0,o.add(f),c.snow){const _=new Le(1,24,14,0,Math.PI*2,0,Math.PI*.56),M=_.attributes.position;for(let m=0;m<M.count;m++){let x=M.getX(m),y=M.getY(m),v=M.getZ(m);const T=Math.atan2(v,x),b=1+.08*Math.sin(T*5+h)+.04*Math.cos(x*4.5+v*4.5);x*=i*c.sx*1.12*b,y*=t*c.sy*.92*b,v*=e*c.sz*1.12*b,M.setXYZ(m,x,y,v)}Yi(_,.55),_.computeVertexNormals();const p=new mt(_,r);p.position.set(c.x,c.y+t*c.sy*.34,c.z),p.castShadow=!0,p.receiveShadow=!0,o.add(p)}}return o}function E_(i){const t=new ee;t.name="JapaneseWinterGarden";const e=new Xt({color:"#f6f9ff",map:i.snow.map,bumpMap:i.snow.bumpMap,bumpScale:.025,roughness:.85,metalness:.01}),n=new Xt({color:"#8f9296",map:i.rock.map,bumpMap:i.rock.bumpMap,bumpScale:.05,roughness:.9,metalness:.02}),s=new Xt({map:i.bambooDry,roughness:.66}),r=new Xt({map:i.bambooGreen,roughness:.52}),o=new Xt({color:"#201b18",roughness:.95}),a=new Xt({map:i.hinoki.map,roughness:.78}),l=new Xt({map:i.pineBark,roughness:.94}),c=new Xt({color:"#d8e8dc",map:i.pineNeedle.map,bumpMap:i.pineNeedle.bumpMap,bumpScale:.04,roughness:.88}),h=new ee;h.name="BambooFence",t.add(h);const u=4.25,d=-Math.PI*.84,f=-Math.PI*.14,_=74,M=1.6,p=[],m=[],x=[],y=[];for(let G=0;G<=_;G++){const rt=G/_,ct=Ae.lerp(d,f,rt),tt=Math.cos(ct)*u,ft=Math.sin(ct)*u,Dt=pn(tt,ft),ht=M+Math.sin(G*.65)*.02,Ut=G%18===0||G===_,Jt=Ut?.072:.048,Se=new mt(new Ze(Jt,Jt*1.04,ht,8),s);Se.position.set(tt,Dt+ht*.48-.08,ft),Se.castShadow=!0,Se.receiveShadow=!0,h.add(Se);const pe=Dt+ht-.08,Ee=u-.056;if((G%3===0||G===_)&&(p.push(new R(Math.cos(ct)*Ee,pe-.12,Math.sin(ct)*Ee)),m.push(new R(Math.cos(ct)*Ee,pe-.68,Math.sin(ct)*Ee)),x.push(new R(Math.cos(ct)*Ee,pe-1.24,Math.sin(ct)*Ee)),y.push(new R(tt,pe+.04,ft))),Ut)for(const vn of[-.12,-.68,-1.24]){const ye=new mt(new si(.08,.016,6,12),o);ye.position.set(Math.cos(ct)*(u-.02),pe+vn,Math.sin(ct)*(u-.02)),ye.rotation.y=-ct,ye.rotation.x=.65,h.add(ye)}}for(const G of[p,m,x]){const rt=new nn(G),ct=new mt(new He(rt,52,.042,8,!1),s);ct.castShadow=!0,ct.receiveShadow=!0,h.add(ct)}const v=new nn(y.map(G=>G.clone().add(new R(0,-.02,0)))),T=new mt(new He(v,52,.062,10,!1),s);T.castShadow=!0,h.add(T);const b=new nn(y.map((G,rt)=>G.clone().add(new R(0,.032+Math.sin(rt*.9)*.014,0)))),g=new He(b,60,.07,10,!1),w=g.attributes.position,P=g.attributes.uv;for(let G=0;G<w.count;G++){const rt=Math.min(1,Math.max(0,P.getX(G))),ct=b.getPoint(rt),tt=w.getY(G)-ct.y,ft=1+.16*Math.sin(rt*26);w.setY(G,ct.y+tt*.72*ft+.02)}Yi(g,.35),g.computeVertexNormals();const C=new mt(g,e);C.castShadow=!0,C.receiveShadow=!0,h.add(C);const D=-3.05,F=.92,U=pn(D,F),L=new ee;L.name="YukimiDoroLantern",L.position.set(D,U-.04,F),L.rotation.y=.42,t.add(L);const V=new mt(new Ze(.56,.62,.14,10),n);V.position.y=.07,V.receiveShadow=!0,V.castShadow=!0,L.add(V);for(let G=0;G<3;G++){const rt=G/3*Math.PI*2+.3,ct=new nn([new R(Math.cos(rt)*.38,.12,Math.sin(rt)*.38),new R(Math.cos(rt)*.34,.42,Math.sin(rt)*.34),new R(Math.cos(rt)*.14,.68,Math.sin(rt)*.14)]),tt=new mt(new He(ct,10,.088,8,!1),n);tt.castShadow=!0,tt.receiveShadow=!0,L.add(tt)}const B=new mt(new Ze(.44,.32,.16,6),n);B.position.y=.74,B.castShadow=!0,B.receiveShadow=!0,L.add(B);const z=1.02,nt=.42;for(let G=0;G<6;G++){const rt=G/6*Math.PI*2,ct=new mt(new ln(.068,nt,.068),n);ct.position.set(Math.cos(rt)*.25,z,Math.sin(rt)*.25),ct.rotation.y=-rt,ct.castShadow=!0,L.add(ct)}for(const G of[z-nt*.48,z+nt*.48]){const rt=new mt(new Ze(.31,.31,.05,6),n);rt.position.y=G,L.add(rt)}const H=new Xt({color:"#ffe6ad",emissive:new wt("#ff9d2e"),emissiveIntensity:2.4,roughness:.4}),Q=new mt(new Ze(.21,.21,nt*.84,6),H);Q.position.y=z,L.add(Q);const it=new vi(.76,.35,6,4),_t=it.attributes.position;for(let G=0;G<_t.count;G++){const rt=_t.getX(G),ct=_t.getY(G),tt=_t.getZ(G),ft=Math.hypot(rt,tt);if(ft>.04){const Dt=Math.pow(ft/.76,1.8)*.085;_t.setY(G,ct+Dt)}}it.computeVertexNormals();const bt=new mt(it,n);bt.position.y=1.4,bt.castShadow=!0,bt.receiveShadow=!0,L.add(bt);const K=new vi(.77,.32,6,6,!0),lt=K.attributes.position;for(let G=0;G<lt.count;G++){const rt=lt.getX(G),ct=lt.getY(G),tt=lt.getZ(G),ft=Math.hypot(rt,tt),Dt=Math.min(1,ft/.77),ht=Math.pow(Dt,1.8)*.085,Ut=.065*Math.sin(Dt*Math.PI*.88)+.025;lt.setY(G,ct+ht+Ut)}Yi(K,.6),K.computeVertexNormals();const St=new mt(K,e);St.position.y=1.44,St.castShadow=!0,St.receiveShadow=!0,L.add(St);const Tt=new mt(new Le(.11,14,12),n);Tt.scale.set(1,1.35,1),Tt.position.y=1.72,Tt.castShadow=!0,L.add(Tt);const gt=new ma("#ffa044",8.2,12,1.6);gt.position.set(0,z,0),gt.castShadow=!0,gt.shadow.mapSize.set(512,512),gt.shadow.bias=-.002,L.add(gt);const Ft=3.22,oe=1.92,Pt=pn(Ft,oe),zt=new ee;zt.name="WoodenFootLantern",zt.position.set(Ft,Pt-.02,oe),zt.rotation.y=-.58,t.add(zt);const Yt=new mt(new ln(.42,.14,.42),n);Yt.position.y=.07,Yt.receiveShadow=!0,zt.add(Yt);const kt=new Xt({color:"#ffedc6",emissive:new wt("#ffaa44"),emissiveIntensity:1.95,roughness:.5}),me=new mt(new ln(.28,.44,.28),kt);me.position.y=.38,zt.add(me);for(const G of[-.145,.145])for(const rt of[-.145,.145]){const ct=new mt(new ln(.036,.52,.036),a);ct.position.set(G,.38,rt),ct.castShadow=!0,zt.add(ct)}const ae=new mt(new vi(.36,.2,4),a);ae.rotation.y=Math.PI/4,ae.position.y=.72,ae.castShadow=!0,zt.add(ae);const we=new vi(.37,.16,4);Yi(we,1.2);const ie=new mt(we,e);ie.rotation.y=Math.PI/4,ie.position.y=.77,zt.add(ie);const Be=new ma("#ffa94d",3.8,7.6,1.7);Be.position.set(0,.42,0),zt.add(Be);const de=2.98,Re=-2.28,Ce=pn(de,Re),fe=new ee;fe.name="SnowyJapanesePine",fe.position.set(de,Ce-.12,Re),t.add(fe);const k=new nn([new R(0,0,0),new R(.14,.82,-.12),new R(-.22,1.68,.18),new R(-.82,2.42,.52),new R(-1.38,2.94,.68)]);function ue(G,rt,ct,tt=22){const ft=new He(G,tt,1,10,!1),Dt=ft.attributes.position,ht=ft.attributes.uv;for(let Jt=0;Jt<Dt.count;Jt++){const Se=Math.min(1,Math.max(0,ht.getX(Jt))),pe=G.getPoint(Se),Ee=Ae.lerp(rt,ct,Math.pow(Se,.85));Dt.setXYZ(Jt,pe.x+(Dt.getX(Jt)-pe.x)*Ee,pe.y+(Dt.getY(Jt)-pe.y)*Ee,pe.z+(Dt.getZ(Jt)-pe.z)*Ee)}ft.computeVertexNormals();const Ut=new mt(ft,l);return Ut.castShadow=!0,Ut.receiveShadow=!0,Ut}fe.add(ue(k,.28,.09,26));const ne=[{pts:[new R(-.26,1.76,.22),new R(-1.05,1.94,.64),new R(-1.78,1.98,.88)],r0:.125,r1:.044,pad:{pos:[-1.8,2.1,.92],rx:1.02,ry:.36,rz:.84,seed:401}},{pts:[new R(0,1.48,.04),new R(.62,1.66,.22),new R(1.02,1.78,.36)],r0:.115,r1:.042,pad:{pos:[1.05,1.9,.38],rx:.84,ry:.33,rz:.74,seed:402}},{pts:[new R(-.64,2.32,.42),new R(-1.24,2.55,-.15),new R(-1.58,2.64,-.44)],r0:.095,r1:.038,pad:{pos:[-1.62,2.76,-.46],rx:.86,ry:.34,rz:.76,seed:403}},{pts:[new R(-.46,2.2,.34),new R(.24,2.54,-.14),new R(.58,2.68,-.32)],r0:.092,r1:.036,pad:{pos:[.62,2.8,-.32],rx:.8,ry:.33,rz:.7,seed:404}}];for(const G of ne){fe.add(ue(new nn(G.pts),G.r0,G.r1,14));const rt=yc({rx:G.pad.rx,ry:G.pad.ry,rz:G.pad.rz,seed:G.pad.seed,pineMat:c,snowMat:e});rt.position.set(...G.pad.pos),fe.add(rt)}const se=yc({rx:1.12,ry:.44,rz:.94,seed:405,pineMat:c,snowMat:e});se.position.set(-1.35,3.16,.64),fe.add(se);const xt=[],ge=[{x:-3.35,z:-3.22,h:3.65,leanX:.4,leanZ:.3,r:.06},{x:-2.92,z:-3.62,h:4.15,leanX:.32,leanZ:.44,r:.065},{x:-2.45,z:-3.9,h:3.55,leanX:.2,leanZ:.35,r:.055},{x:-2,z:-4.12,h:4.2,leanX:-.14,leanZ:.42,r:.062},{x:-1.52,z:-4.25,h:3.45,leanX:.26,leanZ:.32,r:.052},{x:-3.72,z:-2.75,h:3.35,leanX:.44,leanZ:.22,r:.054},{x:-1.04,z:-4.38,h:3.8,leanX:.15,leanZ:.3,r:.056},{x:-2.65,z:-4.15,h:3.95,leanX:.12,leanZ:.38,r:.058}],It=new Xt({color:"#3f6934",roughness:.72,side:sn}),Nt=new Xt({color:"#e1ece5",roughness:.82,side:sn}),A=new Va;A.moveTo(0,0),A.quadraticCurveTo(.14,.055,.34,0),A.quadraticCurveTo(.14,-.055,0,0);const S=new Gr(A,5);ge.forEach((G,rt)=>{const ct=pn(G.x,G.z),tt=new ee;tt.position.set(G.x,ct-.08,G.z);const ft=new nn([new R(0,0,0),new R(G.leanX*.22,G.h*.38,G.leanZ*.22),new R(G.leanX*.62,G.h*.74,G.leanZ*.62),new R(G.leanX,G.h,G.leanZ)]),Dt=new He(ft,18,G.r,8,!1),ht=new mt(Dt,r);ht.castShadow=!0,tt.add(ht);const Ut=Sr(700+rt*19);for(const Jt of[.54,.68,.82,.94,.99]){const Se=ft.getPoint(Jt),pe=5+Math.floor(Ut()*3);for(let Ee=0;Ee<pe;Ee++){const vn=Ut()>.52,ye=new mt(S,vn?Nt:It);ye.position.copy(Se),ye.rotation.set(-.35+Ut()*.7,Ut()*Math.PI*2,-.25-Ut()*.45);const Ti=.78+Ut()*.56;ye.scale.set(Ti,Ti,Ti),tt.add(ye)}}t.add(tt),xt.push({group:tt,phase:rt*.85})});const W=new Xt({color:"#cc242e",roughness:.3,metalness:.05}),at=new Xt({color:"#2e542c",roughness:.68,side:sn});function N(G,rt,ct=1,tt=1){const ft=new ee,Dt=pn(G,rt);ft.position.set(G,Dt-.03,rt),ft.scale.setScalar(ct);const ht=Sr(tt);for(let Ut=0;Ut<5;Ut++){const Jt=Ut/5*Math.PI*2+ht()*.4,Se=.46+ht()*.24,pe=new R(Math.cos(Jt)*.22,Se,Math.sin(Jt)*.22),Ee=new nn([new R(0,0,0),new R(pe.x*.45,Se*.55,pe.z*.45),pe]);ft.add(new mt(new He(Ee,6,.015,5,!1),l));for(let vn=0;vn<5;vn++){const ye=new mt(S,at);ye.position.copy(Ee.getPoint(.55+ht()*.35)),ye.rotation.set(-.2+ht()*.5,ht()*Math.PI*2,-.15-ht()*.3),ye.scale.setScalar(.72+ht()*.3),ft.add(ye)}for(let vn=0;vn<9;vn++){const ye=new mt(new Le(.035,8,8),W);ye.position.set(pe.x+(ht()-.5)*.12,pe.y-ht()*.1,pe.z+(ht()-.5)*.12),ye.castShadow=!0,ft.add(ye)}}t.add(ft)}N(-2.58,2.15,1.08,911),N(3.52,-.35,.96,912);const J=[{x:-3.28,z:2.68,sx:.56,sy:.34,sz:.44,rot:.65},{x:-2.65,z:3.12,sx:.36,sy:.24,sz:.31,rot:-.45}];for(const G of J){const rt=pn(G.x,G.z),ct=new mt(new Ga(1,2),n);ct.scale.set(G.sx,G.sy,G.sz),ct.position.set(G.x,rt+G.sy*.22,G.z),ct.rotation.y=G.rot,ct.castShadow=!0,ct.receiveShadow=!0,t.add(ct);const tt=new Le(1,20,12,0,Math.PI*2,0,Math.PI*.54);Yi(tt,.65);const ft=new mt(tt,e);ft.scale.set(G.sx*.94,G.sy*.72,G.sz*.94),ft.position.set(G.x,rt+G.sy*.56,G.z),ft.rotation.y=G.rot,ft.castShadow=!0,ft.receiveShadow=!0,t.add(ft)}const st=Sr(944),X=-2.98,$=2.94,dt=pn(X,$);for(let G=0;G<14;G++){const rt=G/14*Math.PI*2+st()*.3,ct=new mt(S,G%3===0?Nt:at);ct.position.set(X+Math.cos(rt)*.14,dt+.04,$+Math.sin(rt)*.14),ct.rotation.set(-.32-st()*.3,rt,-.42-st()*.35);const tt=.95+st()*.58;ct.scale.set(tt,tt,tt),t.add(ct)}const I=-1.94,et=2.42,j=pn(I,et),pt=new ee;pt.name="YukiusagiSnowRabbit",pt.position.set(I,j+.1,et),pt.rotation.y=.56;const ut=new mt(new Le(.18,20,16),e);ut.scale.set(1,.84,1.24),ut.castShadow=!0,ut.receiveShadow=!0,pt.add(ut);for(const G of[-1,1]){const rt=new mt(S,at);rt.position.set(G*.068,.118,-.025),rt.rotation.set(.36,G*.36+Math.PI*.5,.24),rt.scale.setScalar(.68),pt.add(rt);const ct=new mt(new Le(.024,10,10),W);ct.position.set(G*.068,.04,.182),pt.add(ct)}return t.add(pt),{group:t,lights:{mainLanternLight:gt,footLanternLight:Be,lanternGlowMat:H,andonGlowMat:kt},lanternWorldPos:new R(D,U+z,F),update(G,rt=1){const ct=1+Math.sin(G*6.3)*.055+Math.sin(G*13.7+1.1)*.03+Math.cos(G*2.9)*.035,tt=1+Math.sin(G*5.1+2.4)*.045+Math.cos(G*11.2)*.025;gt.intensity=8.2*rt*ct,Be.intensity=3.8*rt*tt,H.emissiveIntensity=(1.1+1.55*rt)*ct,kt.emissiveIntensity=(.95+1.25*rt)*tt;for(const ft of xt)ft.group.rotation.z=Math.sin(G*.85+ft.phase)*.022,ft.group.rotation.x=Math.cos(G*.65+ft.phase*1.3)*.014}}}function b_(i){let t=i>>>0;return()=>(t=t*1664525+1013904223>>>0,t/4294967296)}function T_(i,t){const e=new ee;e.name="OnsenAtmosphere";const n=b_(20261120),s=new ee;s.name="HotSpringSteam",e.add(s);const r=[],o=58;for(let P=0;P<o;P++){const C=new Qc({map:i.steam,color:new wt("#f7f2eb"),transparent:!0,opacity:0,depthWrite:!1,blending:Si}),D=new sd(C);D.renderOrder=6,s.add(D);const F=P<18;let U,L;if(F)U=t.x+(n()-.5)*1.15,L=t.y+(n()-.5)*1.05;else{const V=n()*Math.PI*2,B=.62+n()*1.52;U=Ir+Math.cos(V)*B*1.04,L=Nr+Math.sin(V)*B*.84,Math.hypot(U-.16,L-.58)<.72&&(L-=.78)}r.push({sprite:D,mat:C,baseX:U,baseZ:L,phase:n(),lifeSpeed:.105+n()*.07,maxHeight:F?2.6+n()*1.3:2.15+n()*1.45,baseScale:F?.78+n()*.48:.92+n()*.6,peakOpacity:F?.36+n()*.13:.27+n()*.11,driftX:.24+n()*.32,driftZ:-.08+(n()-.5)*.26,swayAmp:.13+n()*.14,swayFreq:.68+n()*.58,rotStart:n()*Math.PI*2,rotSpeed:(n()-.5)*.34})}const a=new ee;a.name="FallingSnow",e.add(a);const l=960,c=new Float32Array(l*3),h=new Float32Array(l),u=[];for(let P=0;P<l;P++){const C=Math.sqrt(n())*9.8,D=n()*Math.PI*2,F=Math.cos(D)*C,U=n()*10.5-.5,L=Math.sin(D)*C;c[P*3]=F,c[P*3+1]=U,c[P*3+2]=L,h[P]=.7+n()*.85,u.push({baseX:F,baseZ:L,y:U,speed:.48+n()*.58,swayAmp:.22+n()*.34,swayFreq:.48+n()*.82,phase:n()*Math.PI*2})}const d=new Me;d.setAttribute("position",new hn(c,3)),d.setAttribute("aSize",new hn(h,1));const f={uMap:{value:i.snowflake},uPixelRatio:{value:Math.min(window.devicePixelRatio||1,2)},uOpacity:{value:.88}},_=new bn({uniforms:f,transparent:!0,depthWrite:!1,blending:Si,vertexShader:`
      attribute float aSize;
      uniform float uPixelRatio;
      varying float vAlpha;

      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        float dist = max(0.5, -mvPos.z);
        // Clamp screen-space size so snowflakes stay delicate and never balloon in front of camera!
        float ptSize = (58.0 * aSize * uPixelRatio) / dist;
        gl_PointSize = clamp(ptSize, 2.0 * uPixelRatio, 10.5 * uPixelRatio);
        // Smoothly fade flakes that drift right in front of the camera lens
        vAlpha = smoothstep(1.4, 3.2, dist) * smoothstep(26.0, 14.0, dist);
        gl_Position = projectionMatrix * mvPos;
      }
    `,fragmentShader:`
      uniform sampler2D uMap;
      uniform float uOpacity;
      varying float vAlpha;

      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        float a = tex.a * uOpacity * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(tex.rgb, a);
      }
    `}),M=new Fl(d,_);M.renderOrder=8,a.add(M);const p=28,m=new Float32Array(p*3),x=[];for(let P=0;P<p;P++){const C=n()*Math.PI*2,D=.2+n()*.36;x.push({vx:Math.cos(C)*D,vz:Math.sin(C)*D,vy:.7+n()*.52,phase:n(),rate:1.55+n()*.75})}const y=new Me;y.setAttribute("position",new hn(m,3));const v=new th({color:"#ecfbff",map:i.snowflake,size:.072,sizeAttenuation:!0,transparent:!0,opacity:.68,depthWrite:!1}),T=new Fl(y,v);T.renderOrder=5,e.add(T);let b=!0,g=!0;const w=new wt("#f7f1e8");return{group:e,setSnowEnabled(P){b=P,a.visible=P},setSteamEnabled(P){g=P,s.visible=P},setSteamTint(P){w.set(P)},update(P,C){if(g)for(const U of r){const L=(U.phase+P*U.lifeSpeed)%1,V=Vn+.14+L*U.maxHeight,B=U.baseX+U.driftX*L+Math.sin(P*U.swayFreq+U.phase*12)*U.swayAmp*L,z=U.baseZ+U.driftZ*L+Math.cos(P*U.swayFreq*.85+U.phase*9)*U.swayAmp*L;U.sprite.position.set(B,V,z);const nt=Ae.smoothstep(L,0,.22),H=1-Ae.smoothstep(L,.5,1);U.mat.opacity=nt*H*U.peakOpacity,U.mat.color.copy(w),U.mat.rotation=U.rotStart+P*U.rotSpeed;const Q=U.baseScale*(.58+L*1.48);U.sprite.scale.set(Q,Q*1.08,1)}if(b){const U=d.attributes.position,L=U.array,V=Math.min(C,.05);for(let B=0;B<l;B++){const z=u[B];z.y-=z.speed*V,z.y<-.45&&(z.y=9.8+B%7*.12),L[B*3]=z.baseX+Math.sin(P*z.swayFreq+z.phase)*z.swayAmp+Math.sin(P*.22)*.28,L[B*3+1]=z.y,L[B*3+2]=z.baseZ+Math.cos(P*z.swayFreq*.85+z.phase)*z.swayAmp}U.needsUpdate=!0}const D=y.attributes.position,F=D.array;for(let U=0;U<p;U++){const L=x[U],V=(L.phase+P*L.rate)%1,B=Vn+.02+L.vy*V-1.35*V*V;F[U*3]=t.x+L.vx*V,F[U*3+1]=Math.max(Vn-.05,B),F[U*3+2]=t.y+L.vz*V}D.needsUpdate=!0}}}function A_({onCameraPreset:i,onMoodPreset:t,onToggleSnow:e,onToggleSteam:n,onToggleRotate:s}){const r=document.getElementById("hud-toggle"),o=document.getElementById("control-panel"),a=document.getElementById("title-badge"),l=Array.from(document.querySelectorAll("#camera-buttons .chip-btn")),c=Array.from(document.querySelectorAll("#mood-buttons .chip-btn")),h=document.getElementById("toggle-snow"),u=document.getElementById("toggle-steam"),d=document.getElementById("toggle-rotate");r?.addEventListener("click",()=>{o?.classList.toggle("collapsed")});function f(M){for(const p of l)p.classList.toggle("active",p.dataset.cam===M)}function _(M){for(const p of c)p.classList.toggle("active",p.dataset.mood===M)}for(const M of l)M.addEventListener("click",()=>{const p=M.dataset.cam;f(p),i(p)});for(const M of c)M.addEventListener("click",()=>{const p=M.dataset.mood;_(p),t(p)});return h?.addEventListener("change",M=>e(M.target.checked)),u?.addEventListener("change",M=>n(M.target.checked)),d?.addEventListener("change",M=>s(M.target.checked)),{setActiveCamButton:f,setActiveMoodButton:_,setHudVisible(M){o&&(o.style.display=M?"":"none"),a&&(a.style.display=M?"":"none"),r&&(r.style.display=M?"":"none")}}}const R_=document.getElementById("canvas-container"),Ke=new Wg({antialias:!0,powerPreference:"high-performance"});Ke.setPixelRatio(Math.min(window.devicePixelRatio,2));Ke.setSize(window.innerWidth,window.innerHeight);Ke.shadowMap.enabled=!0;Ke.shadowMap.type=gs;Ke.toneMapping=wa;Ke.toneMappingExposure=1.1;Ke.outputColorSpace=ke;R_.appendChild(Ke.domElement);const un=new Ju;un.fog=new Na("#1c2840",.012);const Zn=new _n(40,window.innerWidth/window.innerHeight,.1,160),Ie=new Yg(Zn,Ke.domElement);Ie.enableDamping=!0;Ie.dampingFactor=.055;Ie.maxPolarAngle=Math.PI*.54;Ie.minPolarAngle=.18;Ie.minDistance=1.8;Ie.maxDistance=24;Ie.autoRotate=!1;Ie.autoRotateSpeed=.48;const Za={diorama:{pos:new R(6.55,4.2,9.85),target:new R(.62,.56,-.32)},closeup:{pos:new R(1.52,1.02,2.2),target:new R(.06,.45,.36)},low:{pos:new R(-2.35,1.48,4.35),target:new R(.18,.62,-.15)},top:{pos:new R(.5,10.1,5.8),target:new R(0,.18,.02)}};Zn.position.copy(Za.diorama.pos);Ie.target.copy(Za.diorama.target);Ie.update();let en=null;Ie.addEventListener("start",()=>{en=null});function Lh(i,t=!1){const e=Za[i];if(e){if(t){en=null,Zn.position.copy(e.pos),Ie.target.copy(e.target),Ie.update();return}en={startPos:Zn.position.clone(),startTarget:Ie.target.clone(),endPos:e.pos.clone(),endTarget:e.target.clone(),t:0,duration:.95}}}const Us={fur:r_(),yuzu:o_(),rock:a_(),hinoki:l_(),bambooDry:Sc("dry"),bambooGreen:Sc("green"),snow:c_(),pineNeedle:h_(),tenugui:u_(),steam:d_(),splashFoam:f_(),snowflake:p_(),pineBark:m_()},ni=__();un.add(ni.mesh);const C_=g_(Us);un.add(C_);const ai=w_(Us);un.add(ai.group);const Dh=M_(Us);un.add(Dh.group);const Ka=E_(Us);un.add(Ka.group);ai.waterUniforms.uWarmGlowPos.value.copy(Ka.lanternWorldPos);const Ds=T_(Us,ai.splashPoint);un.add(Ds.group);const yr=new Xd("#8fb6e8","#42495a",1);un.add(yr);const rn=new _h("#d7e6ff",1.45);rn.position.set(7.5,9.2,6);rn.castShadow=!0;rn.shadow.mapSize.set(2048,2048);rn.shadow.camera.near=1;rn.shadow.camera.far=28;const Vr=8;rn.shadow.camera.left=-Vr;rn.shadow.camera.right=Vr;rn.shadow.camera.top=Vr;rn.shadow.camera.bottom=-Vr;rn.shadow.bias=-5e-4;rn.shadow.normalBias=.02;un.add(rn);const Ja=new ma("#ffe0bc",.72,4.8,1.8);Ja.position.set(1.1,.92,1.85);un.add(Ja);const Ur=new _h("#9cc2ff",.65);Ur.position.set(-7,5.5,-7.5);un.add(Ur);const Ih={twilight:{skyZenith:"#131f3a",skyMid:"#314772",skyHorizon:"#8a7284",skyGround:"#1a2336",stars:.55,moon:.34,fogColor:"#25324e",fogDensity:.012,hemiSky:"#9ec0ec",hemiGround:"#4a4350",hemiIntensity:1.08,dirColor:"#dce6ff",dirIntensity:1.28,dirPos:[7.5,8.8,6.5],rimColor:"#98c2ff",rimIntensity:.66,lanternScale:1.08,exposure:1.12,waterDeep:"#338486",waterShallow:"#7ecac5",waterSkyReflect:"#4d6a94",waterGlowStrength:1.05,steamTint:"#faf2e8",faceFillIntensity:.72},morning:{skyZenith:"#4c88c9",skyMid:"#8ec0e8",skyHorizon:"#e9eff6",skyGround:"#c4d4e6",stars:0,moon:0,fogColor:"#c9dced",fogDensity:.0085,hemiSky:"#dcedff",hemiGround:"#8798ac",hemiIntensity:1.38,dirColor:"#fff4df",dirIntensity:2.35,dirPos:[8.5,10.5,6.8],rimColor:"#bde0ff",rimIntensity:.55,lanternScale:.24,exposure:1.06,waterDeep:"#3b9a9c",waterShallow:"#98ded9",waterSkyReflect:"#9cc7e8",waterGlowStrength:.22,steamTint:"#ffffff",faceFillIntensity:.45},night:{skyZenith:"#070d1d",skyMid:"#11203d",skyHorizon:"#233659",skyGround:"#0a101d",stars:1,moon:.95,fogColor:"#101a30",fogDensity:.014,hemiSky:"#5d7db3",hemiGround:"#242a38",hemiIntensity:.72,dirColor:"#a8c6ff",dirIntensity:.88,dirPos:[-6.5,9.5,-6.5],rimColor:"#7ea9f0",rimIntensity:.72,lanternScale:1.48,exposure:1.18,waterDeep:"#225e66",waterShallow:"#58a8a8",waterSkyReflect:"#284068",waterGlowStrength:1.45,steamTint:"#f4eadc",faceFillIntensity:.92}};let Nh=Ih.twilight.lanternScale;function $a(i){const t=Ih[i];t&&(ni.uniforms.uZenithColor.value.set(t.skyZenith),ni.uniforms.uMidColor.value.set(t.skyMid),ni.uniforms.uHorizonColor.value.set(t.skyHorizon),ni.uniforms.uGroundColor.value.set(t.skyGround),ni.uniforms.uStarIntensity.value=t.stars,ni.uniforms.uMoonIntensity.value=t.moon,un.fog.color.set(t.fogColor),un.fog.density=t.fogDensity,yr.color.set(t.hemiSky),yr.groundColor.set(t.hemiGround),yr.intensity=t.hemiIntensity,rn.color.set(t.dirColor),rn.intensity=t.dirIntensity,rn.position.set(...t.dirPos),Ur.color.set(t.rimColor),Ur.intensity=t.rimIntensity,Nh=t.lanternScale,Ke.toneMappingExposure=t.exposure,ai.waterUniforms.uDeepColor.value.set(t.waterDeep),ai.waterUniforms.uShallowColor.value.set(t.waterShallow),ai.waterUniforms.uSkyReflect.value.set(t.waterSkyReflect),ai.waterUniforms.uWarmGlowStrength.value=t.waterGlowStrength,Ja.intensity=t.faceFillIntensity,Ds.setSteamTint(t.steamTint))}$a("twilight");const bo=A_({onCameraPreset:i=>Lh(i,!1),onMoodPreset:i=>$a(i),onToggleSnow:i=>Ds.setSnowEnabled(i),onToggleSteam:i=>Ds.setSteamEnabled(i),onToggleRotate:i=>{Ie.autoRotate=i}});let wc=performance.now(),Vi=0;function ms(i){if(Vi+=i,en){en.t=Math.min(1,en.t+i/en.duration);const t=1-Math.pow(1-en.t,3);Zn.position.lerpVectors(en.startPos,en.endPos,t),Ie.target.lerpVectors(en.startTarget,en.endTarget,t),en.t>=1&&(en=null)}Ie.update(),ni.update(Vi),ai.update(Vi),Dh.update(Vi),Ka.update(Vi,Nh),Ds.update(Vi,i),Ke.render(un,Zn)}function Uh(i){requestAnimationFrame(Uh);const t=Math.min(Math.max((i-wc)/1e3,0),.05);wc=i,ms(t)}requestAnimationFrame(Uh);window.addEventListener("resize",()=>{Zn.aspect=window.innerWidth/window.innerHeight,Zn.updateProjectionMatrix(),Ke.setSize(window.innerWidth,window.innerHeight)});window.__ONSEN_DEBUG__={setCamera(i){Lh(i,!0),bo.setActiveCamButton(i),ms(.016)},setCustomCamera(i,t){en=null,Zn.position.set(...i),Ie.target.set(...t),Ie.update(),ms(.016)},setMood(i){$a(i),bo.setActiveMoodButton(i),ms(.016)},setHudVisible(i){bo.setHudVisible(i)},advance(i){const t=Math.max(1,Math.ceil(i/.033));for(let e=0;e<t;e++)ms(i/t)},getStats(){return{triangles:Ke.info.render.triangles,calls:Ke.info.render.calls,geometries:Ke.info.memory.geometries,textures:Ke.info.memory.textures}}};
