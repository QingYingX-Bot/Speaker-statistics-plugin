/**
 * 组件统一导出
 */
export { Navigation } from './Navigation.js';
export { Card } from './Card.js';
export { default as Modal } from './Modal.js';
export { Button } from './Button.js';
export { Input } from './Input.js';
export { Loading } from './Loading.js';
export { EmptyState } from './EmptyState.js';
export { RankCard } from './RankCard.js';
export { AchievementCard } from './AchievementCard.js';
export { ChartCard } from './ChartCard.js';
export { Select } from './Select.js';
export { SearchInput } from './SearchInput.js';
export { Badge } from './Badge.js';
export { Tabs } from './Tabs.js';

// 创建全局组件实例
import { Navigation } from './Navigation.js';
import Modal from './Modal.js';
import { Card } from './Card.js';
import { Button } from './Button.js';
import { Input } from './Input.js';
import { Loading } from './Loading.js';
import { EmptyState } from './EmptyState.js';
import { RankCard } from './RankCard.js';
import { AchievementCard } from './AchievementCard.js';
import { ChartCard } from './ChartCard.js';
import { Select } from './Select.js';
import { SearchInput } from './SearchInput.js';
import { Badge } from './Badge.js';
import { Tabs } from './Tabs.js';

window.Navigation = Navigation;
window.Modal = Modal;
window.Card = Card;
window.Button = Button;
window.Input = Input;
window.Loading = Loading;
window.EmptyState = EmptyState;
window.RankCard = RankCard;
window.AchievementCard = AchievementCard;
window.ChartCard = ChartCard;
window.Select = Select;
window.SearchInput = SearchInput;
window.Badge = Badge;
window.Tabs = Tabs;
