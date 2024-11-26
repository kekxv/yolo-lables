import styles from './App.module.css';
// import default_model from './assets/yolo11n.onnx';
import Yolo from "./lib/yolo";
import {createStore} from "solid-js/store";
import Header from "./components/Header";
import Left from "./components/Left";
import Footer from "./components/Footer";
import Right from "./components/Right";
import MainContainer from "./components/MainContainer";
import {sleep} from "./utils/utils";
import JSZip from "jszip";
import {saveAs} from 'file-saver';
import Toast from "./components/message-box/toast";
import ConfigDrawer from "./components/ConfigDrawer";

const [store, setStore] = createStore({
  left_width: 100,
  file: null,
  index: -1,
  files: [],
  width: 640,
  height: 640,
  predict: 0.45,
});
const [toast, setToast] = createStore({
  messages: []
});
const [config, setConfig] = createStore({
  show: false,
});
let yolo = new Yolo({
  width: store.width,
  height: store.height,
  predict: store.predict,
  // classes: ["corners", "holes"],
});
let last_model = null;

/**
 * 显示提示
 * @param type {'warning'|'danger'|'success'|'info'}
 * @param message {string}
 */
function toastShow(type, message) {
  setToast('messages', toast.messages.length, {type, message});
}

async function yoloDetect({model, image}) {
  model = model || null;
  if (model != null) {
    if (last_model !== model) {
      await yolo.release();
    }
    if (yolo.empty()) {
      last_model = model;
      await yolo.init(model);
    }
  }
  if (yolo.empty()) {
    toastShow("danger", "请先设置模型")
    return;
  }
  let input = await yolo.load_image(image);
  let boxes = await yolo.run(input)
  await yolo.dispose(input);
  return boxes;
}

function cleanFiles() {
  setStore({files: [], file: null, index: -1});
}

function yoloConfigBox() {
  setConfig({show: true})
}

function saveYoloDetect() {
  if (!store.files || store.files.length === 0) {
    toastShow("warning", "文件内容为空", 3000);
    return;
  }
  let zip = new JSZip();
  for (let file of store.files) {
    // console.log(file);
    let context = "";
    for (let label of file.labels) {
      context += label.convertToScale().yoloString() + "\n";
    }
    /**
     * @type {String}
     */
    let path = file.path;
    if (path.lastIndexOf(".") > -1) {
      path = path.substring(0, path.lastIndexOf("."));
    }
    path += ".txt";
    zip.file(path, context, {createFolders: true})
  }
  // 将Zip打包成Blob对象
  zip.generateAsync({type: "blob"})
    .then(function (content) {
      // 下载Zip文件
      saveAs(content, `yolo.labels.${new Date().format("yyyyMMdd")}.zip`);
    });
}

function App() {
  return (
    <div class={styles.App}>
      <Toast
        messages={toast.messages}
        clear={() => {
          setToast({messages: []})
        }}>

      </Toast>
      <Header></Header>
      <Left
        files={store.files}
        file={store.file}
        width={store.left_width}
        index={store.index}
        onSelect={(file, index) => {
          setStore({file: file, index: index})
        }}
      >
      </Left>
      <Right
        files={store.files}
        file={store.file}
        onSelect={(file, index) => {
          setStore({file: file, index: index})
        }}
      >

      </Right>
      <MainContainer
        files={store.files}
        file={store.file}
        left_width={store.left_width}
        index={store.index}
        updateFiles={(files) => {
          setStore({files: files});
          if (files && files.length > 0) {
            setStore({file: files[0], index: 0})
          }
        }}
      >

      </MainContainer>
      <Footer
        left_width={store.left_width}
        cleanFiles={() => cleanFiles()}
        saveYoloDetect={() => saveYoloDetect()}
        yoloConfigBox={() => yoloConfigBox()}
        yoloDetect={async () => {
          if (!store.file) {
            toastShow("warning", "请先选择文件")
            return;
          }
          let boxs = await yoloDetect({image: store.file.url});
          setStore('files', store.index, 'labels', boxs);
          setStore({file: store.files[store.index]})
          console.log(boxs)
          toastShow("info", "识别结束")
        }}
        yoloDetectAll={async () => {
          if (store.files.length === 0) {
            toastShow("warning", "请先选择文件")
            return;
          }
          for (let i in store.files) {
            let boxs = await yoloDetect({image: store.files[i].url});
            await sleep(1);
            console.log(boxs)
            setStore('files', i, 'labels', boxs);
          }
          setStore({file: store.files[store.index]})
          toastShow("info", "识别结束")
        }}
      >
      </Footer>
      <ConfigDrawer
        show={config.show}
        onUpdateModel={(model) => {
          yolo.init(model).then((result) => {
            if (result) {
              toastShow("success", "加载成功")
            } else {
              toastShow("danger", "加载失败")
            }
            console.log("init model", result);
          });
        }}
        onUpdateLabels={(labels) => {
          yolo.update_classes(labels);
          setTimeout(() => {
            toastShow("success", "已经更新 Labels 数据")
          })
        }}
        close={() => {
          setConfig({show: false})
        }}
      >

      </ConfigDrawer>
    </div>
  );
}

export default App;
