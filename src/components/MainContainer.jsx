import {fileToBase64, sleep} from "../utils/utils";
import {children, createEffect, For, Show} from "solid-js";
import {createStore} from "solid-js/store";
import RectBox from "./RectBoxComponent";
import UseDeviceSize from "../lib/use-device-size";

const [state, setState] = createStore({
  rect: {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    naturalWidth: 0,
    naturalHeight: 0,
  },
  files: [],
});

function MainContainer(props) {
  /**
   * @type {HTMLImageElement}
   */
  let image = null;
  const left_width = props.width || 100;
  const files = children(() => props.files || []);
  const file = children(() => props.file);
  const labels = children(() => (props.file || {}).labels);
  const window_size = UseDeviceSize();

  function updateImageSize() {
    if (!image) return;
    setState({
      rect: {
        x: image.offsetLeft - image.width / 2,
        y: image.offsetTop - image.height / 2,
        width: image.width,
        height: image.height,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight
      }
    })
  }

  createEffect(() => {
    window_size.watch() && updateImageSize();
  })

  const onChange = async (event) => {
    await sleep(1);
    let files = [];
    for (let i in event.target.files) {
      if (!(event.target.files[i] instanceof File)) {
        continue;
      }
      if (event.target.files[i].type.indexOf("image/") === -1) {
        continue;
      }
      if (event.target.files[i].type.indexOf("bmp") !== -1) {
        continue;
      }
      try {
        files.push({
          url: await fileToBase64(event.target.files[i]),
          name: event.target.files[i].name,
          path: event.target.files[i].webkitRelativePath || event.target.files[i].name,
          file: event.target.files[i],
          labels: [],
        });
      } catch (err) {
        console.error("file", event.target.files[i], err);
      }
    }
    props.updateFiles?.(files);
  }
  return (
    <div class={``} style={{
      position: "fixed",
      top: "80px",
      right: "350px",
      bottom: "50px",
      left: left_width + "px",
    }}>
      <Show when={files().length <= 0}>
        <div
          class="absolute flex items-center justify-center w-1/2 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mb-1.5">
          <label htmlFor="dropzone-file"
                 className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer border-gray-900 bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true"
                   xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
              </svg>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span
                className="font-semibold">点击选择</span> 或者拖动到此处</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">图片文件夹</p>
            </div>
            <input id="dropzone-file" onChange={onChange} type="file" name="fileList" webkitdirectory
                   directory multiple
                   className="hidden"/>
          </label>
        </div>
      </Show>
      <Show when={file()}>
        <div class={`absolute w-full h-full p-2.5`} style={{"box-sizing": "border-box"}}>
          <img class="absolute h-auto max-w-full max-h-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
               src={file().url} alt={file().name}
               ref={image}
               onLoad={() => {
                 updateImageSize();
               }}
          />
          <div class={`absolute`}
               style={{
                 left: state.rect.x + "px",
                 top: state.rect.y + "px",
                 width: state.rect.width + "px",
                 height: state.rect.height + "px",
               }}
          >
            <For each={labels()}>
              {(item, index) =>
                <RectBox
                  box={item}
                  size={{width: state.rect.width, height: state.rect.height}}
                  onUpdate={(e) => {
                    console.log(e)
                  }}
                />
              }
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default MainContainer;
