import styles from './Header.module.css';

function Header() {
  return (
    <div class={styles.Header}>
      <p>Yolo 自动画框 </p>
      <br/>
      <span>(YoloV8 or Yolo 11)</span>
    </div>
  );
}

export default Header;
