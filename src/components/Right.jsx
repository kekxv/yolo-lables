import styles from './Right.module.css';
import {children, For, Show} from "solid-js";

function Right(props) {
  const file = children(() => props.file);
  const files = children(() => props.files);
  const onSelect = (file, index) => {
    props.onSelect?.(file, index)
  }
  return (
    <div class={`${styles.Right}  scroll-smooth focus:scroll-auto p-0.5 flex flex-col`}>
      <div class={`flex-1 p-0.5 overflow-auto`}>
        <Show when={file()} fallback={<div></div>}>
          <For each={file().labels}>
            {(item, index) =>
              <div class={`p-0.5 border-b`}>
                {/* {item.score.toFixed(3)} : {item.classId} , {item.label} */}
                {item.convertToScale().yoloString()}
              </div>
            }
          </For>
        </Show>
      </div>
      <div class={`flex-1 border-t p-0.5 overflow-auto`} style={{"border-color": "#bebebe"}}>
        <For each={files()} fallback={<div></div>}>
          {(item, index) =>
            <figure
              onClick={() => {
                onSelect(item, index())
              }}
              class="relative max-w-sm transition-all duration-300 cursor-pointer filter m-1.5 mt-2.5">
              <figcaption
                class={`${item.labels && item.labels.length > 0 ? 'text-green-600' : 'text-gray-500'} mt-2 text-sm`}>
                <p>{item.path}</p>
              </figcaption>
            </figure>
          }
        </For>
      </div>
    </div>
  );
}

export default Right;
