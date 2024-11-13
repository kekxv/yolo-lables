import {children, createEffect} from "solid-js";
import {createStore} from "solid-js/store";

function RectBox(props) {
  const onUpdate = (item) => {
    props.onUpdate?.(item)
  }
  const size = children(() => props.size);
  const box = props.box.convertToScale();
  const [store, setStore] = createStore({
    left: box.tl().x * size().width,
    top: box.tl().y * size().height,
    width: box.width * size().width,
    height: box.height * size().height,
    score: box.score,
    label: box.label,
    classId: box.classId,
  });
  createEffect(() => {
    setStore({
      left: box.tl().x * size().width,
      top: box.tl().y * size().height,
      width: box.width * size().width,
      height: box.height * size().height,
    })
  })

  return (
    <div class={`absolute border-green-500 border-2`}
         style={{
           left: store.left + "px",
           top: store.top + "px",
           width: store.width + "px",
           height: store.height + "px"
         }}>
    </div>
  );
}

export default RectBox;
