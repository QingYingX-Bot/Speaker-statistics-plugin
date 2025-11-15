/**
 * 组件统一导出
 */
export { Navbar } from './Navbar.js';
export { Sidebar } from './Sidebar.js';
export { Navigation } from './Navigation.js';
export { Card } from './Card.js';
export { default as Modal } from './Modal.js';
export { Button } from './Button.js';
export { Input } from './Input.js';

// 创建全局组件实例
import { Navbar } from './Navbar.js';
import { Sidebar } from './Sidebar.js';
import { Navigation } from './Navigation.js';
import Modal from './Modal.js';
import { Card } from './Card.js';
import { Button } from './Button.js';
import { Input } from './Input.js';

window.Navbar = Navbar;
window.Sidebar = Sidebar;
window.Navigation = Navigation;
window.Modal = Modal;
window.Card = Card;
window.Button = Button;
window.Input = Input;
