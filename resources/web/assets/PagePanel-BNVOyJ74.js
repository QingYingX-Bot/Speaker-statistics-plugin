import{y as oe,O as t,L as a,bh as re,X as i,M as l,Z as te,$ as ne,d as E,C as c,D as x,G as ae,S as F,ag as de,I as le,T as ie,j as _,bi as C,aL as se,bc as ce,aq as w,ba as be,i as ge,bj as pe,w as P,g as ve,f as fe,t as me,bk as he,e as ue,_ as xe}from"./index-CoWGihkD.js";function Ee(e){return Object.keys(e)}const Ce={paddingSmall:"12px 16px 12px",paddingMedium:"19px 24px 20px",paddingLarge:"23px 32px 24px",paddingHuge:"27px 40px 28px",titleFontSizeSmall:"16px",titleFontSizeMedium:"18px",titleFontSizeLarge:"18px",titleFontSizeHuge:"18px",closeIconSize:"18px",closeSize:"22px"};function Se(e){const{primaryColor:f,borderRadius:p,lineHeight:r,fontSize:v,cardColor:b,textColor2:m,textColor1:S,dividerColor:s,fontWeightStrong:d,closeIconColor:o,closeIconColorHover:n,closeIconColorPressed:g,closeColorHover:h,closeColorPressed:z,modalColor:y,boxShadow1:k,popoverColor:$,actionColor:u}=e;return Object.assign(Object.assign({},Ce),{lineHeight:r,color:b,colorModal:y,colorPopover:$,colorTarget:f,colorEmbedded:u,colorEmbeddedModal:u,colorEmbeddedPopover:u,textColor:m,titleTextColor:S,borderColor:s,actionColor:u,titleFontWeight:d,closeColorHover:h,closeColorPressed:z,closeBorderRadius:p,closeIconColor:o,closeIconColorHover:n,closeIconColorPressed:g,fontSizeSmall:v,fontSizeMedium:v,fontSizeLarge:v,fontSizeHuge:v,boxShadow:k,borderRadius:p})}const ze={common:oe,self:Se},B=a("card-content",`
 flex: 1;
 min-width: 0;
 box-sizing: border-box;
 padding: 0 var(--n-padding-left) var(--n-padding-bottom) var(--n-padding-left);
 font-size: var(--n-font-size);
`),ye=t([a("card",`
 font-size: var(--n-font-size);
 line-height: var(--n-line-height);
 display: flex;
 flex-direction: column;
 width: 100%;
 box-sizing: border-box;
 position: relative;
 border-radius: var(--n-border-radius);
 background-color: var(--n-color);
 color: var(--n-text-color);
 word-break: break-word;
 transition: 
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `,[re({background:"var(--n-color-modal)"}),i("hoverable",[t("&:hover","box-shadow: var(--n-box-shadow);")]),i("content-segmented",[t(">",[a("card-content",`
 padding-top: var(--n-padding-bottom);
 `),l("content-scrollbar",[t(">",[a("scrollbar-container",[t(">",[a("card-content",`
 padding-top: var(--n-padding-bottom);
 `)])])])])])]),i("content-soft-segmented",[t(">",[a("card-content",`
 margin: 0 var(--n-padding-left);
 padding: var(--n-padding-bottom) 0;
 `),l("content-scrollbar",[t(">",[a("scrollbar-container",[t(">",[a("card-content",`
 margin: 0 var(--n-padding-left);
 padding: var(--n-padding-bottom) 0;
 `)])])])])])]),i("footer-segmented",[t(">",[l("footer",`
 padding-top: var(--n-padding-bottom);
 `)])]),i("footer-soft-segmented",[t(">",[l("footer",`
 padding: var(--n-padding-bottom) 0;
 margin: 0 var(--n-padding-left);
 `)])]),t(">",[a("card-header",`
 box-sizing: border-box;
 display: flex;
 align-items: center;
 font-size: var(--n-title-font-size);
 padding:
 var(--n-padding-top)
 var(--n-padding-left)
 var(--n-padding-bottom)
 var(--n-padding-left);
 `,[l("main",`
 font-weight: var(--n-title-font-weight);
 transition: color .3s var(--n-bezier);
 flex: 1;
 min-width: 0;
 color: var(--n-title-text-color);
 `),l("extra",`
 display: flex;
 align-items: center;
 font-size: var(--n-font-size);
 font-weight: 400;
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
 `),l("close",`
 margin: 0 0 0 8px;
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 `)]),l("action",`
 box-sizing: border-box;
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 background-clip: padding-box;
 background-color: var(--n-action-color);
 `),B,a("card-content",[t("&:first-child",`
 padding-top: var(--n-padding-bottom);
 `)]),l("content-scrollbar",`
 display: flex;
 flex-direction: column;
 `,[t(">",[a("scrollbar-container",[t(">",[B])])]),t("&:first-child >",[a("scrollbar-container",[t(">",[a("card-content",`
 padding-top: var(--n-padding-bottom);
 `)])])])]),l("footer",`
 box-sizing: border-box;
 padding: 0 var(--n-padding-left) var(--n-padding-bottom) var(--n-padding-left);
 font-size: var(--n-font-size);
 `,[t("&:first-child",`
 padding-top: var(--n-padding-bottom);
 `)]),l("action",`
 background-color: var(--n-action-color);
 padding: var(--n-padding-bottom) var(--n-padding-left);
 border-bottom-left-radius: var(--n-border-radius);
 border-bottom-right-radius: var(--n-border-radius);
 `)]),a("card-cover",`
 overflow: hidden;
 width: 100%;
 border-radius: var(--n-border-radius) var(--n-border-radius) 0 0;
 `,[t("img",`
 display: block;
 width: 100%;
 `)]),i("bordered",`
 border: 1px solid var(--n-border-color);
 `,[t("&:target","border-color: var(--n-color-target);")]),i("action-segmented",[t(">",[l("action",[t("&:not(:first-child)",`
 border-top: 1px solid var(--n-border-color);
 `)])])]),i("content-segmented, content-soft-segmented",[t(">",[a("card-content",`
 transition: border-color 0.3s var(--n-bezier);
 `,[t("&:not(:first-child)",`
 border-top: 1px solid var(--n-border-color);
 `)]),l("content-scrollbar",`
 transition: border-color 0.3s var(--n-bezier);
 `,[t("&:not(:first-child)",`
 border-top: 1px solid var(--n-border-color);
 `)])])]),i("footer-segmented, footer-soft-segmented",[t(">",[l("footer",`
 transition: border-color 0.3s var(--n-bezier);
 `,[t("&:not(:first-child)",`
 border-top: 1px solid var(--n-border-color);
 `)])])]),i("embedded",`
 background-color: var(--n-color-embedded);
 `)]),te(a("card",`
 background: var(--n-color-modal);
 `,[i("embedded",`
 background-color: var(--n-color-embedded-modal);
 `)])),ne(a("card",`
 background: var(--n-color-popover);
 `,[i("embedded",`
 background-color: var(--n-color-embedded-popover);
 `)]))]),ke={title:[String,Function],contentClass:String,contentStyle:[Object,String],contentScrollable:Boolean,headerClass:String,headerStyle:[Object,String],headerExtraClass:String,headerExtraStyle:[Object,String],footerClass:String,footerStyle:[Object,String],embedded:Boolean,segmented:{type:[Boolean,Object],default:!1},size:String,bordered:{type:Boolean,default:!0},closable:Boolean,hoverable:Boolean,role:String,onClose:[Function,Array],tag:{type:String,default:"div"},cover:Function,content:[String,Function],footer:Function,action:Function,headerExtra:Function,closeFocusable:Boolean},$e=Object.assign(Object.assign({},F.props),ke),_e=E({name:"Card",props:$e,slots:Object,setup(e){const f=()=>{const{onClose:n}=e;n&&ie(n)},{inlineThemeDisabled:p,mergedClsPrefixRef:r,mergedRtlRef:v,mergedComponentPropsRef:b}=ae(e),m=F("Card","-card",ye,ze,e,r),S=de("Card",v,r),s=_(()=>{var n,g;return e.size||((g=(n=b?.value)===null||n===void 0?void 0:n.Card)===null||g===void 0?void 0:g.size)||"medium"}),d=_(()=>{const n=s.value,{self:{color:g,colorModal:h,colorTarget:z,textColor:y,titleTextColor:k,titleFontWeight:$,borderColor:u,actionColor:R,borderRadius:O,lineHeight:j,closeIconColor:M,closeIconColorHover:I,closeIconColorPressed:H,closeColorHover:T,closeColorPressed:L,closeBorderRadius:V,closeIconSize:N,closeSize:W,boxShadow:D,colorPopover:q,colorEmbedded:A,colorEmbeddedModal:G,colorEmbeddedPopover:K,[w("padding",n)]:X,[w("fontSize",n)]:Z,[w("titleFontSize",n)]:J},common:{cubicBezierEaseInOut:Q}}=m.value,{top:U,left:Y,bottom:ee}=be(X);return{"--n-bezier":Q,"--n-border-radius":O,"--n-color":g,"--n-color-modal":h,"--n-color-popover":q,"--n-color-embedded":A,"--n-color-embedded-modal":G,"--n-color-embedded-popover":K,"--n-color-target":z,"--n-text-color":y,"--n-line-height":j,"--n-action-color":R,"--n-title-text-color":k,"--n-title-font-weight":$,"--n-close-icon-color":M,"--n-close-icon-color-hover":I,"--n-close-icon-color-pressed":H,"--n-close-color-hover":T,"--n-close-color-pressed":L,"--n-border-color":u,"--n-box-shadow":D,"--n-padding-top":U,"--n-padding-bottom":ee,"--n-padding-left":Y,"--n-font-size":Z,"--n-title-font-size":J,"--n-close-size":W,"--n-close-icon-size":N,"--n-close-border-radius":V}}),o=p?le("card",_(()=>s.value[0]),d,e):void 0;return{rtlEnabled:S,mergedClsPrefix:r,mergedTheme:m,handleCloseClick:f,cssVars:p?void 0:d,themeClass:o?.themeClass,onRender:o?.onRender}},render(){const{segmented:e,bordered:f,hoverable:p,mergedClsPrefix:r,rtlEnabled:v,onRender:b,embedded:m,tag:S,$slots:s}=this;return b?.(),c(S,{class:[`${r}-card`,this.themeClass,m&&`${r}-card--embedded`,{[`${r}-card--rtl`]:v,[`${r}-card--content-scrollable`]:this.contentScrollable,[`${r}-card--content${typeof e!="boolean"&&e.content==="soft"?"-soft":""}-segmented`]:e===!0||e!==!1&&e.content,[`${r}-card--footer${typeof e!="boolean"&&e.footer==="soft"?"-soft":""}-segmented`]:e===!0||e!==!1&&e.footer,[`${r}-card--action-segmented`]:e===!0||e!==!1&&e.action,[`${r}-card--bordered`]:f,[`${r}-card--hoverable`]:p}],style:this.cssVars,role:this.role},x(s.cover,d=>{const o=this.cover?C([this.cover()]):d;return o&&c("div",{class:`${r}-card-cover`,role:"none"},o)}),x(s.header,d=>{const{title:o}=this,n=o?C(typeof o=="function"?[o()]:[o]):d;return n||this.closable?c("div",{class:[`${r}-card-header`,this.headerClass],style:this.headerStyle,role:"heading"},c("div",{class:`${r}-card-header__main`,role:"heading"},n),x(s["header-extra"],g=>{const h=this.headerExtra?C([this.headerExtra()]):g;return h&&c("div",{class:[`${r}-card-header__extra`,this.headerExtraClass],style:this.headerExtraStyle},h)}),this.closable&&c(ce,{clsPrefix:r,class:`${r}-card-header__close`,onClick:this.handleCloseClick,focusable:this.closeFocusable,absolute:!0})):null}),x(s.default,d=>{const{content:o}=this,n=o?C(typeof o=="function"?[o()]:[o]):d;return n?this.contentScrollable?c(se,{class:`${r}-card__content-scrollbar`,contentClass:[`${r}-card-content`,this.contentClass],contentStyle:this.contentStyle},n):c("div",{class:[`${r}-card-content`,this.contentClass],style:this.contentStyle,role:"none"},n):null}),x(s.footer,d=>{const o=this.footer?C([this.footer()]):d;return o&&c("div",{class:[`${r}-card__footer`,this.footerClass],style:this.footerStyle,role:"none"},o)}),x(s.action,d=>{const o=this.action?C([this.action()]):d;return o&&c("div",{class:`${r}-card__action`,role:"none"},o)}))}}),we={class:"subtitle"},Pe=E({__name:"PagePanel",props:{title:{},subtitle:{}},setup(e){return(f,p)=>(ue(),ge(ve(_e),{title:e.title,class:"panel",segmented:{content:!0},"content-style":"padding-top: 14px;"},pe({default:P(()=>[he(f.$slots,"default",{},void 0,!0)]),_:2},[e.subtitle?{name:"header-extra",fn:P(()=>[fe("span",we,me(e.subtitle),1)]),key:"0"}:void 0]),1032,["title"]))}}),Fe=xe(Pe,[["__scopeId","data-v-5d700d06"]]);export{Fe as P,Ee as k};
