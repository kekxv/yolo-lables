import {children, createEffect, createSignal} from "solid-js";
import Yolo from "../lib/yolo";

export default function ConfigDrawer(props) {
  const show = children(() => props.show);
  const [labels, setLabels] = createSignal(Yolo.yolo_classes.join("\n"))

  createEffect(() => {
    props.onUpdateLabels?.(labels().split("\n"));
  })

  function close() {
    props.close?.();
  }

  async function onChange(event) {
    if (!event.target || !event.target.files || event.target.files.length !== 1) return;
    let file = event.target.files[0];
    try {
      let fileUint8Array = await new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = function () {
          let array = new Uint8Array(this.result);
          resolve(array);
        }
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
      // console.log("fileUint8Array", fileUint8Array);
      props.onUpdateModel?.(fileUint8Array);
    } finally {
      event.target.value = null;
    }
  }


  return (
    <div
      className={`fixed top-0 right-0 z-40 h-screen p-4 overflow-y-auto shadow transition-transform bg-white w-80 ${show() ? '' : 'translate-x-full'}`}
      tabindex="-1" aria-labelledby="drawer-label">
      <h5 id="drawer-label"
          class="inline-flex items-center mb-4 text-base font-semibold text-black">
        <svg className="w-4 h-4 me-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor"
             viewBox="0 0 20 20">
          <path
            d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
        </svg>
        模型设置
      </h5>
      <button type="button"
              onClick={() => close()}
              class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 absolute top-2.5 end-2.5 flex items-center justify-center">
        <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
        </svg>
        <span className="sr-only">Close menu</span>
      </button>

      <p className="text-sm text-gray-600">
        选择一个模型并更新
      </p>
      <div className="flex mb-6 items-center justify-center w-full">
        <label htmlFor="dropzone-onnx-file"
               className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true"
                 xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
            </svg>
            <p className="mb-2 text-sm text-gray-500"><span
              className="font-semibold">点击选择</span>或者拖动到此处</p>
            <p className="text-xs text-gray-500">模型文件，支持onnx格式</p>
          </div>
          <input id="dropzone-onnx-file" onChange={onChange} type="file" className="hidden" accept=".onnx"/>
        </label>
      </div>
      <p className="text-sm text-gray-600">
        模型labels
      </p>
      <textarea id="message" rows="20"
                value={labels()}
                className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                placeholder="默认为 YOLO labels"
                onfocusout={(e) => {
                  setLabels(e.target.value)
                }}>

      </textarea>
    </div>
  )
}
