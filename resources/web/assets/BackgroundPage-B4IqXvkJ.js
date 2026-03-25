import{s as kt,v as Ct,x as St,y as st,z as Rt,d as Me,A as Ye,C as x,D as Tt,E as Qe,G as Ze,H as zt,I as Ge,J as qe,j as S,B as ee,K as Pt,W as _t,L as s,M as ie,O as ae,P as Bt,Q as It,R as Mt,S as De,r as m,T as fe,U as Dt,V as Nt,X as I,Y as et,Z as $t,$ as jt,a0 as Ft,a1 as Vt,a2 as Ot,a3 as Ht,a4 as Je,a5 as Ut,a6 as Et,a7 as Lt,l as Ce,a8 as dt,a9 as At,aa as Be,ab as Ie,ac as Ae,k as Wt,u as Kt,o as Xt,i as xe,w as M,a as D,h as U,g as R,f as p,m as tt,ad as ye,p as We,ae as ot,t as N,q as Yt,c as ke,N as Gt,e as E,b as Ke,_ as qt}from"./index-CoWGihkD.js";import{k as Jt,P as Zt}from"./PagePanel-BNVOyJ74.js";import{N as nt}from"./Alert-C00jSBV_.js";import{N as Qt}from"./Spin-CLZDFkMF.js";const eo={iconSize:"22px"};function to(a){const{fontSize:i,warningColor:v}=a;return Object.assign(Object.assign({},eo),{fontSize:i,iconColor:v})}const oo=kt({name:"Popconfirm",common:st,peers:{Button:St,Popover:Ct},self:to}),no={railHeight:"4px",railWidthVertical:"4px",handleSize:"18px",dotHeight:"8px",dotWidth:"8px",dotBorderRadius:"4px"};function ao(a){const i="rgba(0, 0, 0, .85)",v="0 2px 8px 0 rgba(0, 0, 0, 0.12)",{railColor:u,primaryColor:f,baseColor:d,cardColor:P,modalColor:g,popoverColor:b,borderRadius:T,fontSize:k,opacityDisabled:y}=a;return Object.assign(Object.assign({},no),{fontSize:k,markFontSize:k,railColor:u,railColorHover:u,fillColor:f,fillColorHover:f,opacityDisabled:y,handleColor:"#FFF",dotColor:P,dotColorModal:g,dotColorPopover:b,handleBoxShadow:"0 1px 4px 0 rgba(0, 0, 0, 0.3), inset 0 0 1px 0 rgba(0, 0, 0, 0.05)",handleBoxShadowHover:"0 1px 4px 0 rgba(0, 0, 0, 0.3), inset 0 0 1px 0 rgba(0, 0, 0, 0.05)",handleBoxShadowActive:"0 1px 4px 0 rgba(0, 0, 0, 0.3), inset 0 0 1px 0 rgba(0, 0, 0, 0.05)",handleBoxShadowFocus:"0 1px 4px 0 rgba(0, 0, 0, 0.3), inset 0 0 1px 0 rgba(0, 0, 0, 0.05)",indicatorColor:i,indicatorBoxShadow:v,indicatorTextColor:d,indicatorBorderRadius:T,dotBorder:`2px solid ${u}`,dotBorderActive:`2px solid ${f}`,dotBoxShadow:""})}const io={common:st,self:ao},ct=Rt("n-popconfirm"),ut={positiveText:String,negativeText:String,showIcon:{type:Boolean,default:!0},onPositiveClick:{type:Function,required:!0},onNegativeClick:{type:Function,required:!0}},at=Jt(ut),ro=Me({name:"NPopconfirmPanel",props:ut,setup(a){const{localeRef:i}=Qe("Popconfirm"),{inlineThemeDisabled:v}=Ze(),{mergedClsPrefixRef:u,mergedThemeRef:f,props:d}=zt(ct),P=S(()=>{const{common:{cubicBezierEaseInOut:b},self:{fontSize:T,iconSize:k,iconColor:y}}=f.value;return{"--n-bezier":b,"--n-font-size":T,"--n-icon-size":k,"--n-icon-color":y}}),g=v?Ge("popconfirm-panel",void 0,P,d):void 0;return Object.assign(Object.assign({},Qe("Popconfirm")),{mergedClsPrefix:u,cssVars:v?void 0:P,localizedPositiveText:S(()=>a.positiveText||i.value.positiveText),localizedNegativeText:S(()=>a.negativeText||i.value.negativeText),positiveButtonProps:qe(d,"positiveButtonProps"),negativeButtonProps:qe(d,"negativeButtonProps"),handlePositiveClick(b){a.onPositiveClick(b)},handleNegativeClick(b){a.onNegativeClick(b)},themeClass:g?.themeClass,onRender:g?.onRender})},render(){var a;const{mergedClsPrefix:i,showIcon:v,$slots:u}=this,f=Ye(u.action,()=>this.negativeText===null&&this.positiveText===null?[]:[this.negativeText!==null&&x(ee,Object.assign({size:"small",onClick:this.handleNegativeClick},this.negativeButtonProps),{default:()=>this.localizedNegativeText}),this.positiveText!==null&&x(ee,Object.assign({size:"small",type:"primary",onClick:this.handlePositiveClick},this.positiveButtonProps),{default:()=>this.localizedPositiveText})]);return(a=this.onRender)===null||a===void 0||a.call(this),x("div",{class:[`${i}-popconfirm__panel`,this.themeClass],style:this.cssVars},Tt(u.default,d=>v||d?x("div",{class:`${i}-popconfirm__body`},v?x("div",{class:`${i}-popconfirm__icon`},Ye(u.icon,()=>[x(Pt,{clsPrefix:i},{default:()=>x(_t,null)})])):null,d):null),f?x("div",{class:[`${i}-popconfirm__action`]},f):null)}}),lo=s("popconfirm",[ie("body",`
 font-size: var(--n-font-size);
 display: flex;
 align-items: center;
 flex-wrap: nowrap;
 position: relative;
 `,[ie("icon",`
 display: flex;
 font-size: var(--n-icon-size);
 color: var(--n-icon-color);
 transition: color .3s var(--n-bezier);
 margin: 0 8px 0 0;
 `)]),ie("action",`
 display: flex;
 justify-content: flex-end;
 `,[ae("&:not(:first-child)","margin-top: 8px"),s("button",[ae("&:not(:last-child)","margin-right: 8px;")])])]),so=Object.assign(Object.assign(Object.assign({},De.props),Dt),{positiveText:String,negativeText:String,showIcon:{type:Boolean,default:!0},trigger:{type:String,default:"click"},positiveButtonProps:Object,negativeButtonProps:Object,onPositiveClick:Function,onNegativeClick:Function}),co=Me({name:"Popconfirm",props:so,slots:Object,__popover__:!0,setup(a){const{mergedClsPrefixRef:i}=Ze(),v=De("Popconfirm","-popconfirm",lo,oo,a,i),u=m(null);function f(g){var b;if(!(!((b=u.value)===null||b===void 0)&&b.getMergedShow()))return;const{onPositiveClick:T,"onUpdate:show":k}=a;Promise.resolve(T?T(g):!0).then(y=>{var C;y!==!1&&((C=u.value)===null||C===void 0||C.setShow(!1),k&&fe(k,!1))})}function d(g){var b;if(!(!((b=u.value)===null||b===void 0)&&b.getMergedShow()))return;const{onNegativeClick:T,"onUpdate:show":k}=a;Promise.resolve(T?T(g):!0).then(y=>{var C;y!==!1&&((C=u.value)===null||C===void 0||C.setShow(!1),k&&fe(k,!1))})}return Nt(ct,{mergedThemeRef:v,mergedClsPrefixRef:i,props:a}),{setShow(g){var b;(b=u.value)===null||b===void 0||b.setShow(g)},syncPosition(){var g;(g=u.value)===null||g===void 0||g.syncPosition()},mergedTheme:v,popoverInstRef:u,handlePositiveClick:f,handleNegativeClick:d}},render(){const{$slots:a,$props:i,mergedTheme:v}=this;return x(Mt,Object.assign({},It(i,at),{theme:v.peers.Popover,themeOverrides:v.peerOverrides.Popover,internalExtraClass:["popconfirm"],ref:"popoverInstRef"}),{trigger:a.trigger,default:()=>{const u=Bt(i,at);return x(ro,Object.assign({},u,{onPositiveClick:this.handlePositiveClick,onNegativeClick:this.handleNegativeClick}),a)}})}}),uo=ae([s("slider",`
 display: block;
 padding: calc((var(--n-handle-size) - var(--n-rail-height)) / 2) 0;
 position: relative;
 z-index: 0;
 width: 100%;
 cursor: pointer;
 user-select: none;
 -webkit-user-select: none;
 `,[I("reverse",[s("slider-handles",[s("slider-handle-wrapper",`
 transform: translate(50%, -50%);
 `)]),s("slider-dots",[s("slider-dot",`
 transform: translateX(50%, -50%);
 `)]),I("vertical",[s("slider-handles",[s("slider-handle-wrapper",`
 transform: translate(-50%, -50%);
 `)]),s("slider-marks",[s("slider-mark",`
 transform: translateY(calc(-50% + var(--n-dot-height) / 2));
 `)]),s("slider-dots",[s("slider-dot",`
 transform: translateX(-50%) translateY(0);
 `)])])]),I("vertical",`
 box-sizing: content-box;
 padding: 0 calc((var(--n-handle-size) - var(--n-rail-height)) / 2);
 width: var(--n-rail-width-vertical);
 height: 100%;
 `,[s("slider-handles",`
 top: calc(var(--n-handle-size) / 2);
 right: 0;
 bottom: calc(var(--n-handle-size) / 2);
 left: 0;
 `,[s("slider-handle-wrapper",`
 top: unset;
 left: 50%;
 transform: translate(-50%, 50%);
 `)]),s("slider-rail",`
 height: 100%;
 `,[ie("fill",`
 top: unset;
 right: 0;
 bottom: unset;
 left: 0;
 `)]),I("with-mark",`
 width: var(--n-rail-width-vertical);
 margin: 0 32px 0 8px;
 `),s("slider-marks",`
 top: calc(var(--n-handle-size) / 2);
 right: unset;
 bottom: calc(var(--n-handle-size) / 2);
 left: 22px;
 font-size: var(--n-mark-font-size);
 `,[s("slider-mark",`
 transform: translateY(50%);
 white-space: nowrap;
 `)]),s("slider-dots",`
 top: calc(var(--n-handle-size) / 2);
 right: unset;
 bottom: calc(var(--n-handle-size) / 2);
 left: 50%;
 `,[s("slider-dot",`
 transform: translateX(-50%) translateY(50%);
 `)])]),I("disabled",`
 cursor: not-allowed;
 opacity: var(--n-opacity-disabled);
 `,[s("slider-handle",`
 cursor: not-allowed;
 `)]),I("with-mark",`
 width: 100%;
 margin: 8px 0 32px 0;
 `),ae("&:hover",[s("slider-rail",{backgroundColor:"var(--n-rail-color-hover)"},[ie("fill",{backgroundColor:"var(--n-fill-color-hover)"})]),s("slider-handle",{boxShadow:"var(--n-handle-box-shadow-hover)"})]),I("active",[s("slider-rail",{backgroundColor:"var(--n-rail-color-hover)"},[ie("fill",{backgroundColor:"var(--n-fill-color-hover)"})]),s("slider-handle",{boxShadow:"var(--n-handle-box-shadow-hover)"})]),s("slider-marks",`
 position: absolute;
 top: 18px;
 left: calc(var(--n-handle-size) / 2);
 right: calc(var(--n-handle-size) / 2);
 `,[s("slider-mark",`
 position: absolute;
 transform: translateX(-50%);
 white-space: nowrap;
 `)]),s("slider-rail",`
 width: 100%;
 position: relative;
 height: var(--n-rail-height);
 background-color: var(--n-rail-color);
 transition: background-color .3s var(--n-bezier);
 border-radius: calc(var(--n-rail-height) / 2);
 `,[ie("fill",`
 position: absolute;
 top: 0;
 bottom: 0;
 border-radius: calc(var(--n-rail-height) / 2);
 transition: background-color .3s var(--n-bezier);
 background-color: var(--n-fill-color);
 `)]),s("slider-handles",`
 position: absolute;
 top: 0;
 right: calc(var(--n-handle-size) / 2);
 bottom: 0;
 left: calc(var(--n-handle-size) / 2);
 `,[s("slider-handle-wrapper",`
 outline: none;
 position: absolute;
 top: 50%;
 transform: translate(-50%, -50%);
 cursor: pointer;
 display: flex;
 `,[s("slider-handle",`
 height: var(--n-handle-size);
 width: var(--n-handle-size);
 border-radius: 50%;
 overflow: hidden;
 transition: box-shadow .2s var(--n-bezier), background-color .3s var(--n-bezier);
 background-color: var(--n-handle-color);
 box-shadow: var(--n-handle-box-shadow);
 `,[ae("&:hover",`
 box-shadow: var(--n-handle-box-shadow-hover);
 `)]),ae("&:focus",[s("slider-handle",`
 box-shadow: var(--n-handle-box-shadow-focus);
 `,[ae("&:hover",`
 box-shadow: var(--n-handle-box-shadow-active);
 `)])])])]),s("slider-dots",`
 position: absolute;
 top: 50%;
 left: calc(var(--n-handle-size) / 2);
 right: calc(var(--n-handle-size) / 2);
 `,[I("transition-disabled",[s("slider-dot","transition: none;")]),s("slider-dot",`
 transition:
 border-color .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 position: absolute;
 transform: translate(-50%, -50%);
 height: var(--n-dot-height);
 width: var(--n-dot-width);
 border-radius: var(--n-dot-border-radius);
 overflow: hidden;
 box-sizing: border-box;
 border: var(--n-dot-border);
 background-color: var(--n-dot-color);
 `,[I("active","border: var(--n-dot-border-active);")])])]),s("slider-handle-indicator",`
 font-size: var(--n-font-size);
 padding: 6px 10px;
 border-radius: var(--n-indicator-border-radius);
 color: var(--n-indicator-text-color);
 background-color: var(--n-indicator-color);
 box-shadow: var(--n-indicator-box-shadow);
 `,[et()]),s("slider-handle-indicator",`
 font-size: var(--n-font-size);
 padding: 6px 10px;
 border-radius: var(--n-indicator-border-radius);
 color: var(--n-indicator-text-color);
 background-color: var(--n-indicator-color);
 box-shadow: var(--n-indicator-box-shadow);
 `,[I("top",`
 margin-bottom: 12px;
 `),I("right",`
 margin-left: 12px;
 `),I("bottom",`
 margin-top: 12px;
 `),I("left",`
 margin-right: 12px;
 `),et()]),$t(s("slider",[s("slider-dot","background-color: var(--n-dot-color-modal);")])),jt(s("slider",[s("slider-dot","background-color: var(--n-dot-color-popover);")]))]);function it(a){return window.TouchEvent&&a instanceof window.TouchEvent}function rt(){const a=new Map,i=v=>u=>{a.set(v,u)};return Ft(()=>{a.clear()}),[a,i]}const vo=0,fo=Object.assign(Object.assign({},De.props),{to:Je.propTo,defaultValue:{type:[Number,Array],default:0},marks:Object,disabled:{type:Boolean,default:void 0},formatTooltip:Function,keyboard:{type:Boolean,default:!0},min:{type:Number,default:0},max:{type:Number,default:100},step:{type:[Number,String],default:1},range:Boolean,value:[Number,Array],placement:String,showTooltip:{type:Boolean,default:void 0},tooltip:{type:Boolean,default:!0},vertical:Boolean,reverse:Boolean,"onUpdate:value":[Function,Array],onUpdateValue:[Function,Array],onDragstart:[Function],onDragend:[Function]}),Xe=Me({name:"Slider",props:fo,slots:Object,setup(a){const{mergedClsPrefixRef:i,namespaceRef:v,inlineThemeDisabled:u}=Ze(a),f=De("Slider","-slider",uo,io,a,i),d=m(null),[P,g]=rt(),[b,T]=rt(),k=m(new Set),y=Et(a),{mergedDisabledRef:C}=y,te=S(()=>{const{step:t}=a;if(Number(t)<=0||t==="mark")return 0;const e=t.toString();let o=0;return e.includes(".")&&(o=e.length-e.indexOf(".")-1),o}),V=m(a.defaultValue),oe=qe(a,"value"),j=Lt(oe,V),z=S(()=>{const{value:t}=j;return(a.range?t:[t]).map(de)}),O=S(()=>z.value.length>2),ne=S(()=>a.placement===void 0?a.vertical?"right":"top":a.placement),he=S(()=>{const{marks:t}=a;return t?Object.keys(t).map(Number.parseFloat):null}),_=m(-1),Y=m(-1),L=m(-1),A=m(!1),re=m(!1),le=S(()=>{const{vertical:t,reverse:e}=a;return t?e?"top":"bottom":e?"right":"left"}),H=S(()=>{if(O.value)return;const t=z.value,e=q(a.range?Math.min(...t):a.min),o=q(a.range?Math.max(...t):t[0]),{value:n}=le;return a.vertical?{[n]:`${e}%`,height:`${o-e}%`}:{[n]:`${e}%`,width:`${o-e}%`}}),pe=S(()=>{const t=[],{marks:e}=a;if(e){const o=z.value.slice();o.sort((w,l)=>w-l);const{value:n}=le,{value:r}=O,{range:c}=a,h=r?()=>!1:w=>c?w>=o[0]&&w<=o[o.length-1]:w<=o[0];for(const w of Object.keys(e)){const l=Number(w);t.push({active:h(l),key:l,label:e[w],style:{[n]:`${q(l)}%`}})}}return t});function Ne(t,e){const o=q(t),{value:n}=le;return{[n]:`${o}%`,zIndex:e===_.value?1:0}}function ge(t){return a.showTooltip||L.value===t||_.value===t&&A.value}function $e(t){return A.value?!(_.value===t&&Y.value===t):!0}function W(t){var e;~t&&(_.value=t,(e=P.get(t))===null||e===void 0||e.focus())}function Se(){b.forEach((t,e)=>{ge(e)&&t.syncPosition()})}function Re(t){const{"onUpdate:value":e,onUpdateValue:o}=a,{nTriggerFormInput:n,nTriggerFormChange:r}=y;o&&fe(o,t),e&&fe(e,t),V.value=t,n(),r()}function se(t){const{range:e}=a;if(e){if(Array.isArray(t)){const{value:o}=z;t.join()!==o.join()&&Re(t)}}else Array.isArray(t)||z.value[0]!==t&&Re(t)}function G(t,e){if(a.range){const o=z.value.slice();o.splice(e,1,t),se(o)}else se(t)}function me(t,e,o){const n=o!==void 0;o||(o=t-e>0?1:-1);const r=he.value||[],{step:c}=a;if(c==="mark"){const l=ce(t,r.concat(e),n?o:void 0);return l?l.value:e}if(c<=0)return e;const{value:h}=te;let w;if(n){const l=Number((e/c).toFixed(h)),B=Math.floor(l),Q=l>B?B:B-1,$=l<B?B:B+1;w=ce(e,[Number((Q*c).toFixed(h)),Number(($*c).toFixed(h)),...r],o)}else{const l=je(t);w=ce(t,[...r,l])}return w?de(w.value):e}function de(t){return Math.min(a.max,Math.max(a.min,t))}function q(t){const{max:e,min:o}=a;return(t-o)/(e-o)*100}function be(t){const{max:e,min:o}=a;return o+(e-o)*t}function je(t){const{step:e,min:o}=a;if(Number(e)<=0||e==="mark")return t;const n=Math.round((t-o)/e)*e+o;return Number(n.toFixed(te.value))}function ce(t,e=he.value,o){if(!e?.length)return null;let n=null,r=-1;for(;++r<e.length;){const c=e[r]-t,h=Math.abs(c);(o===void 0||c*o>0)&&(n===null||h<n.distance)&&(n={index:r,distance:h,value:e[r]})}return n}function Te(t){const e=d.value;if(!e)return;const o=it(t)?t.touches[0]:t,n=e.getBoundingClientRect();let r;return a.vertical?r=(n.bottom-o.clientY)/n.height:r=(o.clientX-n.left)/n.width,a.reverse&&(r=1-r),be(r)}function Fe(t){if(C.value||!a.keyboard)return;const{vertical:e,reverse:o}=a;switch(t.key){case"ArrowUp":t.preventDefault(),ue(e&&o?-1:1);break;case"ArrowRight":t.preventDefault(),ue(!e&&o?-1:1);break;case"ArrowDown":t.preventDefault(),ue(e&&o?1:-1);break;case"ArrowLeft":t.preventDefault(),ue(!e&&o?1:-1);break}}function ue(t){const e=_.value;if(e===-1)return;const{step:o}=a,n=z.value[e],r=Number(o)<=0||o==="mark"?n:n+o*t;G(me(r,n,t>0?1:-1),e)}function Ve(t){var e,o;if(C.value||!it(t)&&t.button!==vo)return;const n=Te(t);if(n===void 0)return;const r=z.value.slice(),c=a.range?(o=(e=ce(n,r))===null||e===void 0?void 0:e.index)!==null&&o!==void 0?o:-1:0;c!==-1&&(t.preventDefault(),W(c),ze(),G(me(n,z.value[c]),c))}function ze(){A.value||(A.value=!0,a.onDragstart&&fe(a.onDragstart),Be("touchend",document,F),Be("mouseup",document,F),Be("touchmove",document,ve),Be("mousemove",document,ve))}function K(){A.value&&(A.value=!1,a.onDragend&&fe(a.onDragend),Ie("touchend",document,F),Ie("mouseup",document,F),Ie("touchmove",document,ve),Ie("mousemove",document,ve))}function ve(t){const{value:e}=_;if(!A.value||e===-1){K();return}const o=Te(t);o!==void 0&&G(me(o,z.value[e]),e)}function F(){K()}function we(t){_.value=t,C.value||(L.value=t)}function Oe(t){_.value===t&&(_.value=-1,K()),L.value===t&&(L.value=-1)}function Pe(t){L.value=t}function He(t){L.value===t&&(L.value=-1)}Ce(_,(t,e)=>{Ae(()=>Y.value=e)}),Ce(j,()=>{if(a.marks){if(re.value)return;re.value=!0,Ae(()=>{re.value=!1})}Ae(Se)}),dt(()=>{K()});const J=S(()=>{const{self:{markFontSize:t,railColor:e,railColorHover:o,fillColor:n,fillColorHover:r,handleColor:c,opacityDisabled:h,dotColor:w,dotColorModal:l,handleBoxShadow:B,handleBoxShadowHover:Q,handleBoxShadowActive:$,handleBoxShadowFocus:Ue,dotBorder:Ee,dotBoxShadow:Le,railHeight:vt,railWidthVertical:ft,handleSize:ht,dotHeight:pt,dotWidth:gt,dotBorderRadius:mt,fontSize:bt,dotBorderActive:wt,dotColorPopover:xt},common:{cubicBezierEaseInOut:yt}}=f.value;return{"--n-bezier":yt,"--n-dot-border":Ee,"--n-dot-border-active":wt,"--n-dot-border-radius":mt,"--n-dot-box-shadow":Le,"--n-dot-color":w,"--n-dot-color-modal":l,"--n-dot-color-popover":xt,"--n-dot-height":pt,"--n-dot-width":gt,"--n-fill-color":n,"--n-fill-color-hover":r,"--n-font-size":bt,"--n-handle-box-shadow":B,"--n-handle-box-shadow-active":$,"--n-handle-box-shadow-focus":Ue,"--n-handle-box-shadow-hover":Q,"--n-handle-color":c,"--n-handle-size":ht,"--n-opacity-disabled":h,"--n-rail-color":e,"--n-rail-color-hover":o,"--n-rail-height":vt,"--n-rail-width-vertical":ft,"--n-mark-font-size":t}}),Z=u?Ge("slider",void 0,J,a):void 0,_e=S(()=>{const{self:{fontSize:t,indicatorColor:e,indicatorBoxShadow:o,indicatorTextColor:n,indicatorBorderRadius:r}}=f.value;return{"--n-font-size":t,"--n-indicator-border-radius":r,"--n-indicator-box-shadow":o,"--n-indicator-color":e,"--n-indicator-text-color":n}}),X=u?Ge("slider-indicator",void 0,_e,a):void 0;return{mergedClsPrefix:i,namespace:v,uncontrolledValue:V,mergedValue:j,mergedDisabled:C,mergedPlacement:ne,isMounted:At(),adjustedTo:Je(a),dotTransitionDisabled:re,markInfos:pe,isShowTooltip:ge,shouldKeepTooltipTransition:$e,handleRailRef:d,setHandleRefs:g,setFollowerRefs:T,fillStyle:H,getHandleStyle:Ne,activeIndex:_,arrifiedValues:z,followerEnabledIndexSet:k,handleRailMouseDown:Ve,handleHandleFocus:we,handleHandleBlur:Oe,handleHandleMouseEnter:Pe,handleHandleMouseLeave:He,handleRailKeyDown:Fe,indicatorCssVars:u?void 0:_e,indicatorThemeClass:X?.themeClass,indicatorOnRender:X?.onRender,cssVars:u?void 0:J,themeClass:Z?.themeClass,onRender:Z?.onRender}},render(){var a;const{mergedClsPrefix:i,themeClass:v,formatTooltip:u}=this;return(a=this.onRender)===null||a===void 0||a.call(this),x("div",{class:[`${i}-slider`,v,{[`${i}-slider--disabled`]:this.mergedDisabled,[`${i}-slider--active`]:this.activeIndex!==-1,[`${i}-slider--with-mark`]:this.marks,[`${i}-slider--vertical`]:this.vertical,[`${i}-slider--reverse`]:this.reverse}],style:this.cssVars,onKeydown:this.handleRailKeyDown,onMousedown:this.handleRailMouseDown,onTouchstart:this.handleRailMouseDown},x("div",{class:`${i}-slider-rail`},x("div",{class:`${i}-slider-rail__fill`,style:this.fillStyle}),this.marks?x("div",{class:[`${i}-slider-dots`,this.dotTransitionDisabled&&`${i}-slider-dots--transition-disabled`]},this.markInfos.map(f=>x("div",{key:f.key,class:[`${i}-slider-dot`,{[`${i}-slider-dot--active`]:f.active}],style:f.style}))):null,x("div",{ref:"handleRailRef",class:`${i}-slider-handles`},this.arrifiedValues.map((f,d)=>{const P=this.isShowTooltip(d);return x(Vt,null,{default:()=>[x(Ot,null,{default:()=>x("div",{ref:this.setHandleRefs(d),class:`${i}-slider-handle-wrapper`,tabindex:this.mergedDisabled?-1:0,role:"slider","aria-valuenow":f,"aria-valuemin":this.min,"aria-valuemax":this.max,"aria-orientation":this.vertical?"vertical":"horizontal","aria-disabled":this.disabled,style:this.getHandleStyle(f,d),onFocus:()=>{this.handleHandleFocus(d)},onBlur:()=>{this.handleHandleBlur(d)},onMouseenter:()=>{this.handleHandleMouseEnter(d)},onMouseleave:()=>{this.handleHandleMouseLeave(d)}},Ye(this.$slots.thumb,()=>[x("div",{class:`${i}-slider-handle`})]))}),this.tooltip&&x(Ht,{ref:this.setFollowerRefs(d),show:P,to:this.adjustedTo,enabled:this.showTooltip&&!this.range||this.followerEnabledIndexSet.has(d),teleportDisabled:this.adjustedTo===Je.tdkey,placement:this.mergedPlacement,containerClass:this.namespace},{default:()=>x(Ut,{name:"fade-in-scale-up-transition",appear:this.isMounted,css:this.shouldKeepTooltipTransition(d),onEnter:()=>{this.followerEnabledIndexSet.add(d)},onAfterLeave:()=>{this.followerEnabledIndexSet.delete(d)}},{default:()=>{var g;return P?((g=this.indicatorOnRender)===null||g===void 0||g.call(this),x("div",{class:[`${i}-slider-handle-indicator`,this.indicatorThemeClass,`${i}-slider-handle-indicator--${this.mergedPlacement}`],style:this.indicatorCssVars},typeof u=="function"?u(f):f)):null}})})]})})),this.marks?x("div",{class:`${i}-slider-marks`},this.markInfos.map(f=>x("div",{key:f.key,class:`${i}-slider-mark`,style:f.style},typeof f.label=="function"?f.label():f.label))):null))}}),ho={class:"toolbar"},po={class:"workspace"},go={class:"editor-panel"},mo={class:"drop-title"},bo={class:"drop-actions"},wo={key:0,class:"page-note meta"},xo={class:"editor-head"},yo={class:"page-note"},ko={class:"canvas-wrap"},Co={class:"controls"},So={class:"slider-box"},Ro={class:"page-note"},To={class:"slider-box"},zo={class:"page-note"},Po={class:"slider-box"},_o={class:"page-note"},Bo={class:"action-row"},Io={key:0,class:"page-note"},Mo={class:"preview-panel"},Do={class:"preview-card"},No={class:"preview-box"},$o=["src"],jo={key:1,class:"page-note"},Fo={class:"preview-card"},Vo={class:"preview-box server"},Oo=["src"],Ho={id:"statusText",class:"page-note status-note"},Uo=2*1024*1024,lt=760/360,Eo=Me({__name:"BackgroundPage",setup(a){const i=Wt(),v=Kt(),u=m(null),f=m(null),d=m("normal"),P=m("auto"),g=m(135),b=m(0),T=m(0),k=m(null),y=m(null),C=m(null),te=m(""),V=m(""),oe=m(!1),j=m(!1),z=m(!1),O=m(!1),ne=m(""),he=m(Date.now()),_=m("");let Y=null;const L=[{label:"普通背景（个人统计）",value:"normal"},{label:"排行榜背景",value:"ranking"}],A=[{label:"推荐比例（760:360）",value:"auto"},{label:"1:1",value:"square"},{label:"4:3",value:"4x3"},{label:"16:9",value:"16x9"},{label:"原图比例",value:"free"}],re=S(()=>d.value==="ranking"),le=S(()=>{if(d.value==="ranking")return 1520/200;switch(P.value){case"square":return 1;case"4x3":return 4/3;case"16x9":return 16/9;case"free":{const t=y.value;return t&&t.naturalHeight>0?t.naturalWidth/t.naturalHeight:lt}default:return lt}}),H=S(()=>{const t=y.value;if(!t||t.naturalWidth<=0||t.naturalHeight<=0)return null;const e=t.naturalWidth,o=t.naturalHeight,n=le.value;if(n<=0)return null;let r=e,c=r/n;c>o&&(c=o,r=c*n);const h=W(g.value,100,350)/100,w=W(r/h,1,e),l=W(c/h,1,o),B=Math.max(0,(e-w)/2),Q=Math.max(0,(o-l)/2),$=e/2+W(b.value,-100,100)/100*B,Ue=o/2+W(T.value,-100,100)/100*Q,Ee=W($-w/2,0,e-w),Le=W(Ue-l/2,0,o-l);return{x:Ee,y:Le,w,h:l}}),pe=S(()=>{if(d.value==="ranking")return{width:1520,height:200};const t=H.value?H.value.w/H.value.h:le.value;return Re(t)}),Ne=S(()=>`${pe.value.width} × ${pe.value.height}`),ge=S(()=>!i.user.userId||!O.value?"":`/api/background/${encodeURIComponent(i.user.userId)}?type=${d.value}&_=${he.value}`),$e=S(()=>!!k.value&&!!i.secretKey&&!!i.user.userId&&!!H.value&&!z.value);function W(t,e,o){return Math.min(o,Math.max(e,t))}function Se(t){if(t<1024)return`${t} B`;const e=t/1024;return e<1024?`${e.toFixed(1)} KB`:`${(e/1024).toFixed(2)} MB`}function Re(t){let e=1280,o=Math.max(1,Math.round(e/t));return o>1280&&(o=1280,e=Math.max(1,Math.round(o*t))),{width:e,height:o}}function se(){te.value&&(URL.revokeObjectURL(te.value),te.value="")}function G(){V.value&&(URL.revokeObjectURL(V.value),V.value="")}function me(){u.value?.click()}function de(){u.value&&(u.value.value="")}function q(){k.value=null,y.value=null,C.value=null,oe.value=!1,se(),G(),de(),F()}function be(){g.value=d.value==="ranking"?120:135,b.value=0,T.value=0}function je(){oe.value=!0}function ce(t){const e=t.currentTarget,o=t.relatedTarget;e&&o&&e.contains(o)||(oe.value=!1)}function Te(t){oe.value=!1;const e=t.dataTransfer?.files?.[0];e&&ze(e)}function Fe(t){const o=t.target.files?.[0];o&&ze(o)}function ue(t){return["image/jpeg","image/jpg","image/png"].includes(t.type)||/\.(jpe?g|png)$/i.test(t.name)?t.size>Uo?"图片超过 2MB，请压缩后再上传":null:"仅支持 JPG / PNG 图片"}function Ve(t){return new Promise((e,o)=>{const n=new Image;n.onload=()=>e(n),n.onerror=()=>o(new Error("加载失败")),n.src=t})}async function ze(t){const e=ue(t);if(e){v.error(e),de();return}const o=URL.createObjectURL(t);try{const n=await Ve(o);se(),G(),k.value=t,te.value=o,y.value=n,C.value={width:n.naturalWidth,height:n.naturalHeight,sizeText:Se(t.size),type:t.type||"image/jpeg"},be(),K(),F(),we()}catch{URL.revokeObjectURL(o),v.error("读取图片失败，请重新选择"),de()}}function K(){const t=f.value;if(!t)return;const e=t.parentElement?.clientWidth||860,o=Math.max(320,Math.min(980,Math.floor(e))),n=Math.floor(o*.56);(t.width!==o||t.height!==n)&&(t.width=o,t.height=n)}function ve(t,e,o,n){const r=t/e;let c=o,h=c/r;return h>n&&(h=n,c=h*r),{x:(o-c)/2,y:(n-h)/2,w:c,h}}function F(){const t=f.value,e=t?.getContext("2d");if(!t||!e)return;K();const o=t.width,n=t.height;e.clearRect(0,0,o,n);const r=e.createLinearGradient(0,0,o,n);if(r.addColorStop(0,"#0f0f12"),r.addColorStop(1,"#1f1f24"),e.fillStyle=r,e.fillRect(0,0,o,n),!y.value){e.fillStyle="rgba(236, 236, 241, 0.82)",e.font='500 14px "Space Grotesk", "Noto Sans SC", sans-serif',e.textAlign="center",e.textBaseline="middle",e.fillText("选择图片后在此预览构图",o/2,n/2);return}const c=y.value,h=ve(c.naturalWidth,c.naturalHeight,o,n);e.drawImage(c,h.x,h.y,h.w,h.h);const w=H.value;if(!w)return;const l={x:h.x+w.x/c.naturalWidth*h.w,y:h.y+w.y/c.naturalHeight*h.h,w:w.w/c.naturalWidth*h.w,h:w.h/c.naturalHeight*h.h};e.save(),e.fillStyle="rgba(8, 8, 10, 0.56)",e.beginPath(),e.rect(0,0,o,n),e.rect(l.x,l.y,l.w,l.h),e.fill("evenodd"),e.restore(),e.strokeStyle="#f2f2f2",e.lineWidth=2,e.strokeRect(l.x,l.y,l.w,l.h);const B=l.w/3,Q=l.h/3;e.strokeStyle="rgba(255, 255, 255, 0.72)",e.lineWidth=1;for(let $=1;$<=2;$+=1)e.beginPath(),e.moveTo(l.x+B*$,l.y),e.lineTo(l.x+B*$,l.y+l.h),e.stroke(),e.beginPath(),e.moveTo(l.x,l.y+Q*$),e.lineTo(l.x+l.w,l.y+Q*$),e.stroke()}function we(){Y!==null&&window.clearTimeout(Y),Y=window.setTimeout(()=>{Oe()},120)}async function Oe(){const t=await Pe();G(),t&&(V.value=URL.createObjectURL(t))}async function Pe(){const t=y.value,e=H.value;if(!t||!e)return null;const o=pe.value,n=document.createElement("canvas");n.width=o.width,n.height=o.height;const r=n.getContext("2d");return r?(r.fillStyle="#111114",r.fillRect(0,0,o.width,o.height),r.drawImage(t,e.x,e.y,e.w,e.h,0,0,o.width,o.height),await new Promise(c=>{n.toBlob(h=>c(h),"image/jpeg",.92)})):null}function He(t){const e=new Date(t);return Number.isNaN(e.getTime())?t:e.toLocaleString("zh-CN")}async function J(){if(!i.user.userId){O.value=!1,ne.value="未识别用户，无法读取背景状态。";return}j.value=!0;try{const t=await Ke.getBackgroundInfo(i.user.userId,d.value);if(!t.success||!t.data){O.value=!1,ne.value=t.success?"读取背景状态失败。":t.error;return}if(O.value=!!t.data.file?.exists,he.value=Date.now(),!O.value){ne.value="当前类型暂无已上传背景。";return}const e=t.data.file,o=e.modified?He(e.modified):"未知时间",n=e.size?Se(Number(e.size)):"未知大小";ne.value=`服务器背景：${n}，最近修改 ${o}`}finally{j.value=!1}}async function Z(){if(!i.user.userId){v.warning("未识别用户");return}if(!i.secretKey){v.warning("请先设置密钥");return}if(!k.value||!H.value){v.warning("请选择图片并完成构图");return}const t=await Pe();if(!t){v.error("导出失败，请重试");return}const e=new File([t],`background_${Date.now()}.jpg`,{type:"image/jpeg"}),o=new FormData;o.append("background",e),o.append("userId",i.user.userId),o.append("secretKey",i.secretKey),o.append("backgroundType",d.value),z.value=!0;try{const n=await Ke.applyBackground(o);if(!n.success){v.error(n.error||"上传失败");return}_.value=n.data?.recommendedDimensions||"",v.success(n.message||n.data?.message||"上传成功"),q(),await J()}finally{z.value=!1}}async function _e(){if(i.user.userId){if(!i.secretKey){v.warning("请先设置密钥");return}j.value=!0;try{const t=await Ke.deleteBackground(i.user.userId,d.value,i.secretKey);if(!t.success){v.error(t.error||"删除失败");return}v.success(t.message||"已删除背景"),await J()}finally{j.value=!1}}}function X(){K(),F()}return Ce(d,async()=>{d.value==="ranking"&&(P.value="auto"),be(),F(),we(),await J()}),Ce(H,()=>{F(),we()}),Ce(()=>i.user.userId,()=>{q(),J()},{immediate:!0}),Xt(()=>{K(),F(),window.addEventListener("resize",X)}),dt(()=>{se(),G(),Y!==null&&window.clearTimeout(Y),window.removeEventListener("resize",X)}),(t,e)=>(E(),xe(Zt,{title:"背景管理",subtitle:"拖拽上传、实时裁剪、一键发布"},{default:M(()=>[D(R(nt),{type:"info",class:"help"},{default:M(()=>[...e[5]||(e[5]=[U(" 支持 `jpg/png`，文件不超过 `2MB`。上传时会按你当前构图导出为 JPG。 ",-1)])]),_:1}),p("div",ho,[D(R(tt),{value:d.value,"onUpdate:value":e[0]||(e[0]=o=>d.value=o),options:L,class:"ctrl"},null,8,["value"]),D(R(ee),{loading:j.value,onClick:J},{default:M(()=>[...e[6]||(e[6]=[U("刷新状态",-1)])]),_:1},8,["loading"]),D(R(co),{onPositiveClick:_e},{trigger:M(()=>[D(R(ee),{type:"error",disabled:!O.value||!R(i).secretKey||j.value},{default:M(()=>[...e[7]||(e[7]=[U(" 删除当前背景 ",-1)])]),_:1},8,["disabled"])]),default:M(()=>[e[8]||(e[8]=U(" 确认删除当前背景吗？ ",-1))]),_:1})]),R(i).secretKey?ye("",!0):(E(),xe(R(nt),{key:0,type:"warning",class:"warn"},{default:M(()=>[...e[9]||(e[9]=[U(" 当前未设置密钥，请先在“设置”页配置。 ",-1)])]),_:1})),p("div",po,[p("section",go,[p("div",{class:ot(["dropzone",{active:oe.value,ready:!!k.value}]),onDragover:We(je,["prevent"]),onDragleave:We(ce,["prevent"]),onDrop:We(Te,["prevent"])},[p("input",{ref_key:"fileInput",ref:u,type:"file",class:"hidden-input",accept:".jpg,.jpeg,.png,image/jpeg,image/png",onChange:Fe},null,544),p("p",mo,N(k.value?"已选择图片":"拖拽图片到这里"),1),e[11]||(e[11]=p("p",{class:"drop-note"},"也可以点击按钮选择文件",-1)),p("div",bo,[D(R(ee),{size:"small",onClick:me},{default:M(()=>[U(N(k.value?"重新选择":"选择图片"),1)]),_:1}),k.value?(E(),xe(R(ee),{key:0,size:"small",quaternary:"",onClick:q},{default:M(()=>[...e[10]||(e[10]=[U(" 清空 ",-1)])]),_:1})):ye("",!0),k.value?(E(),xe(R(Yt),{key:1,size:"small",type:"success",round:""},{default:M(()=>[U(N(k.value.name),1)]),_:1})):ye("",!0)]),C.value?(E(),ke("p",wo,N(C.value.width)+" × "+N(C.value.height)+" · "+N(C.value.sizeText)+" · "+N(C.value.type),1)):ye("",!0)],34),p("div",{class:ot(["editor-card",{disabled:!y.value}])},[p("div",xo,[e[12]||(e[12]=p("h3",null,"构图编辑",-1)),p("span",yo,"导出尺寸："+N(Ne.value),1)]),p("div",ko,[p("canvas",{ref_key:"editorCanvas",ref:f,class:"editor-canvas"},null,512)]),e[15]||(e[15]=p("p",{class:"page-note"},"通过缩放和偏移调整画面。排行榜背景固定为 1520:200 比例。",-1)),p("div",Co,[D(R(tt),{value:P.value,"onUpdate:value":e[1]||(e[1]=o=>P.value=o),options:A,disabled:re.value||!y.value,class:"ctrl"},null,8,["value","disabled"]),p("div",So,[p("span",Ro,"缩放："+N(g.value)+"%",1),D(R(Xe),{value:g.value,"onUpdate:value":e[2]||(e[2]=o=>g.value=o),min:100,max:350,step:1,disabled:!y.value},null,8,["value","disabled"])]),p("div",To,[p("span",zo,"水平偏移："+N(b.value)+"%",1),D(R(Xe),{value:b.value,"onUpdate:value":e[3]||(e[3]=o=>b.value=o),min:-100,max:100,step:1,disabled:!y.value},null,8,["value","disabled"])]),p("div",Po,[p("span",_o,"垂直偏移："+N(T.value)+"%",1),D(R(Xe),{value:T.value,"onUpdate:value":e[4]||(e[4]=o=>T.value=o),min:-100,max:100,step:1,disabled:!y.value},null,8,["value","disabled"])])]),p("div",Bo,[D(R(ee),{disabled:!y.value,onClick:be},{default:M(()=>[...e[13]||(e[13]=[U("重置构图",-1)])]),_:1},8,["disabled"]),D(R(ee),{type:"primary",disabled:!$e.value,loading:z.value,onClick:Z},{default:M(()=>[...e[14]||(e[14]=[U(" 导出并上传 ",-1)])]),_:1},8,["disabled","loading"])]),_.value?(E(),ke("p",Io,"服务端建议尺寸："+N(_.value),1)):ye("",!0)],2)]),p("section",Mo,[p("div",Do,[e[16]||(e[16]=p("h4",null,"本地裁剪预览",-1)),p("div",No,[V.value?(E(),ke("img",{key:0,src:V.value,alt:"裁剪预览"},null,8,$o)):(E(),ke("div",jo,"选择图片并调整构图后会在这里预览"))])]),D(R(Qt),{show:j.value},{default:M(()=>[p("div",Fo,[e[17]||(e[17]=p("h4",null,"服务器当前背景",-1)),p("div",Vo,[O.value&&ge.value?(E(),ke("img",{key:0,src:ge.value,alt:"服务器背景"},null,8,Oo)):(E(),xe(R(Gt),{key:1,description:"当前类型暂无已设置背景"}))])])]),_:1},8,["show"]),p("p",Ho,N(ne.value),1)])])]),_:1}))}}),Xo=qt(Eo,[["__scopeId","data-v-dd686d71"]]);export{Xo as default};
