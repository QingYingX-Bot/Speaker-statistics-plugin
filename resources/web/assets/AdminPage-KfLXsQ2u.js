import{P as A}from"./PagePanel-BNVOyJ74.js";import{y as D,L as I,af as w,M as g,X as p,d as P,C as y,F as N,G as M,S as B,I as R,j as V,k as K,u as O,l as T,i as _,w as l,g as s,h as u,c as $,f as k,t as h,a as v,B as j,N as S,r as C,e as f,b as E,_ as L}from"./index-CoWGihkD.js";import{N as z}from"./Alert-C00jSBV_.js";import{N as b}from"./Statistic-9Sqyy8fZ.js";import{N as G}from"./DataTable-lizY7gvZ.js";import{N as W}from"./Spin-CLZDFkMF.js";import"./Input-7vvqdDNQ.js";function F(n){const{textColor1:e,dividerColor:c,fontWeightStrong:r}=n;return{textColor:e,color:c,fontWeight:r}}const U={common:D,self:F},H=I("divider",`
 position: relative;
 display: flex;
 width: 100%;
 box-sizing: border-box;
 font-size: 16px;
 color: var(--n-text-color);
 transition:
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
`,[w("vertical",`
 margin-top: 24px;
 margin-bottom: 24px;
 `,[w("no-title",`
 display: flex;
 align-items: center;
 `)]),g("title",`
 display: flex;
 align-items: center;
 margin-left: 12px;
 margin-right: 12px;
 white-space: nowrap;
 font-weight: var(--n-font-weight);
 `),p("title-position-left",[g("line",[p("left",{width:"28px"})])]),p("title-position-right",[g("line",[p("right",{width:"28px"})])]),p("dashed",[g("line",`
 background-color: #0000;
 height: 0px;
 width: 100%;
 border-style: dashed;
 border-width: 1px 0 0;
 `)]),p("vertical",`
 display: inline-block;
 height: 1em;
 margin: 0 8px;
 vertical-align: middle;
 width: 1px;
 `),g("line",`
 border: none;
 transition: background-color .3s var(--n-bezier), border-color .3s var(--n-bezier);
 height: 1px;
 width: 100%;
 margin: 0;
 `),w("dashed",[g("line",{backgroundColor:"var(--n-color)"})]),p("dashed",[g("line",{borderColor:"var(--n-color)"})]),p("vertical",{backgroundColor:"var(--n-color)"})]),X=Object.assign(Object.assign({},B.props),{titlePlacement:{type:String,default:"center"},dashed:Boolean,vertical:Boolean}),q=P({name:"Divider",props:X,setup(n){const{mergedClsPrefixRef:e,inlineThemeDisabled:c}=M(n),r=B("Divider","-divider",H,U,n,e),t=V(()=>{const{common:{cubicBezierEaseInOut:i},self:{color:d,textColor:x,fontWeight:a}}=r.value;return{"--n-bezier":i,"--n-color":d,"--n-text-color":x,"--n-font-weight":a}}),o=c?R("divider",void 0,t,n):void 0;return{mergedClsPrefix:e,cssVars:c?void 0:t,themeClass:o?.themeClass,onRender:o?.onRender}},render(){var n;const{$slots:e,titlePlacement:c,vertical:r,dashed:t,cssVars:o,mergedClsPrefix:i}=this;return(n=this.onRender)===null||n===void 0||n.call(this),y("div",{role:"separator",class:[`${i}-divider`,this.themeClass,{[`${i}-divider--vertical`]:r,[`${i}-divider--no-title`]:!e.default,[`${i}-divider--dashed`]:t,[`${i}-divider--title-position-${c}`]:e.default&&c}],style:o},r?null:y("div",{class:`${i}-divider__line ${i}-divider__line--left`}),!r&&e.default?y(N,null,y("div",{class:`${i}-divider__title`},this.$slots),y("div",{class:`${i}-divider__line ${i}-divider__line--right`})):null)}}),J={class:"toolbar"},Q={class:"page-note"},Y={class:"stats-grid"},Z=P({__name:"AdminPage",setup(n){const e=K(),c=O(),r=C(!1),t=C(null),o=C(""),i=[{title:"群组",key:"group_name",ellipsis:{tooltip:!0}},{title:"群ID",key:"group_id",width:130},{title:"用户数",key:"user_count",width:110,render:a=>d(a.user_count)},{title:"消息数",key:"message_count",width:130,render:a=>d(a.message_count)}];function d(a){return Number(a||0).toLocaleString("zh-CN")}async function x(){if(!e.user.userId||!e.secretKey||!e.user.isAdmin){t.value=null;return}r.value=!0;const a=await E.getAdminOverview(e.user.userId,e.secretKey);if(r.value=!1,!a.success||!a.data){t.value=null,c.error(a.success?"读取管理总览失败":a.error||"读取管理总览失败");return}t.value=a.data,o.value=new Date().toLocaleString("zh-CN")}return T(()=>[e.user.userId,e.user.isAdmin,e.secretKey],()=>{x()},{immediate:!0}),(a,m)=>(f(),_(A,{title:"管理台",subtitle:"管理员可见"},{default:l(()=>[s(e).user.isAdmin?s(e).secretKey?(f(),$(N,{key:2},[k("div",J,[k("span",Q,"最后更新时间："+h(o.value||"尚未加载"),1),v(s(j),{type:"primary",loading:r.value,onClick:x},{default:l(()=>[...m[2]||(m[2]=[u("刷新总览",-1)])]),_:1},8,["loading"])]),v(s(W),{show:r.value},{default:l(()=>[t.value?(f(),$(N,{key:1},[k("div",Y,[v(s(b),{label:"总群组"},{default:l(()=>[u(h(d(t.value.totalGroups)),1)]),_:1}),v(s(b),{label:"总用户"},{default:l(()=>[u(h(d(t.value.totalUsers)),1)]),_:1}),v(s(b),{label:"总消息"},{default:l(()=>[u(h(d(t.value.totalMessages)),1)]),_:1}),v(s(b),{label:"今日消息"},{default:l(()=>[u(h(d(t.value.todayMessages)),1)]),_:1}),v(s(b),{label:"活跃群"},{default:l(()=>[u(h(d(t.value.activeGroups)),1)]),_:1}),v(s(b),{label:"今日新增用户"},{default:l(()=>[u(h(d(t.value.todayNewUsers)),1)]),_:1})]),v(s(q),null,{default:l(()=>[...m[3]||(m[3]=[u("重点群组",-1)])]),_:1}),(t.value.groupStats||[]).length?(f(),_(s(G),{key:1,columns:i,data:t.value.groupStats,bordered:!1,"single-line":!1,size:"small"},null,8,["data"])):(f(),_(s(S),{key:0,description:"暂无重点群组数据",class:"panel-empty"}))],64)):(f(),_(s(S),{key:0,description:"暂无管理统计数据",class:"panel-empty"}))]),_:1},8,["show"])],64)):(f(),_(s(z),{key:1,type:"info",title:"请先配置密钥"},{default:l(()=>[...m[1]||(m[1]=[u(" 管理接口要求 `userId + secretKey`，请先到“设置”页保存密钥。 ",-1)])]),_:1})):(f(),_(s(z),{key:0,type:"warning",title:"当前账号不是管理员"},{default:l(()=>[...m[0]||(m[0]=[u(" 你可以继续使用普通统计功能，管理接口需要在 key.json 中配置为 admin。 ",-1)])]),_:1}))]),_:1}))}}),oe=L(Z,[["__scopeId","data-v-91167ebe"]]);export{oe as default};
