import {children, For} from "solid-js";
import {createStore} from "solid-js/store";

const [state, setState] = createStore({
  loading: false,
  files: [],
});

function Left(props) {
  const width = props.width || 100;

  return (
    <div class={`scroll-smooth focus:scroll-auto p-1.5`} style={{
      "position": "fixed",
      "left": "0",
      "top": "80px",
      "bottom": "0",
      "width": width + "px",
      "border-right": "1px solid #b1b1b1",
      "overflow": "scroll",
    }}>
    </div>
  );
}

export default Left;
