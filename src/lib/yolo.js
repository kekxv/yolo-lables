// 参考了 https://github.com/AndreyGermanov/yolov8_onnx_javascript
import ort, {env} from 'onnxruntime-web'
import ort_webgpu, {env as env_webgpu} from 'onnxruntime-web/webgpu'
import {fastNMS, Point} from "./fast-nms";

console.log("versions", ort.env.versions)
if (import.meta.env.DEV) {
  env.wasm.wasmPaths = "/node_modules/onnxruntime-web/dist/";
  env.webgpu.wasmPaths = "/node_modules/onnxruntime-web/dist/";
  env.webgl.wasmPaths = "/node_modules/onnxruntime-web/dist/";
  env_webgpu.wasm.wasmPaths = "/node_modules/onnxruntime-web/dist/";
  env_webgpu.webgpu.wasmPaths = "/node_modules/onnxruntime-web/dist/";
  env_webgpu.webgl.wasmPaths = "/node_modules/onnxruntime-web/dist/";
}

function sleep(timeout) {
  return new Promise(resolve => setTimeout(() => resolve(), timeout));
}

export class BoxInfo {
  #x;
  #y;
  #x2;
  #y2;
  #label;
  #prob;
  #class_id;
  #img_width;
  #img_height;

  // [x1, y1, x2, y2, label, prob, class_id,img_width,img_height]
  constructor(options) {
    if (options instanceof Array && options.length === 9) {
      this.#x = options[0];
      this.#y = options[1];
      this.#x2 = options[2];
      this.#y2 = options[3];
      this.#label = options[4];
      this.#prob = options[5];
      this.#class_id = options[6];
      this.#img_width = options[7];
      this.#img_height = options[8];
      if (this.#x > 1 || this.#y > 1 || this.#x2 > 1 || this.#y2 > 1) {
        this.#x = parseInt(this.#x);
        this.#y = parseInt(this.#y);
        this.#x2 = parseInt(this.#x2);
        this.#y2 = parseInt(this.#y2);
      }
    }
  }


  get width() {
    return Math.abs(this.#x2 - this.#x);
  }

  get height() {
    return Math.abs(this.#y2 - this.#y);
  }

  get score() {
    return this.#prob;
  }

  get classId() {
    return this.#class_id;
  }

  get label() {
    return this.#label;
  }


  center() {
    return {x: (this.#x + this.#x2) / 2, y: (this.#y + this.#y2) / 2};
  }

  area() {
    return this.width * this.height;
  }

  tl() {
    return {x: this.#x, y: this.#y};
  }

  br() {
    return {x: this.#x2, y: this.#y2};
  }

  convertToScale() {
    let x = this.#x / this.#img_width;
    let y = this.#y / this.#img_height;
    let x2 = this.#x2 / this.#img_width;
    let y2 = this.#y2 / this.#img_height;
    // [x1, y1, x2, y2, label, prob, class_id]
    return new BoxInfo([x, y, x2, y2, this.#label, this.#prob, this.#class_id, this.#img_width, this.#img_height]);
  }

  convertToPixel() {
    let x = this.#x * this.#img_width;
    let y = this.#y * this.#img_height;
    let x2 = this.#x2 * this.#img_width;
    let y2 = this.#y2 * this.#img_height;
    // [x1, y1, x2, y2, label, prob, class_id]
    return new BoxInfo([x, y, x2, y2, this.#label, this.#prob, this.#class_id, this.#img_width, this.#img_height]);
  }

  yoloString() {
    if (this.#x <= 1 && this.#y <= 1 && this.#x2 <= 1 && this.#y2 <= 1) {
      return `${this.#class_id} ${this.#x.toFixed(6)} ${this.#y.toFixed(6)} ${this.width.toFixed(6)} ${this.height.toFixed(6)}`;
    }
    return `${this.#class_id} ${this.#x} ${this.#y} ${this.width} ${this.height}`;
  }

  toString() {
    let center = this.center();
    return `${center.x} x ${center.y} (${this.width}, ${this.height})`;
  }
}

export default class Yolo {
  #width = 640;
  #height = 640;
  #prob = 0.5;
  #classes = [];
  /**
   *
   * @type {InferenceSession}
   */
  #session = null;
  #fast_nms = true;

  constructor({classes = null, width = 640, height = 0, predict = 0.45}) {
    console.log("versions", ort.env.versions)
    this.#prob = predict < 0.05 ? 0.45 : predict;
    this.#width = width
    this.#height = height <= 0 ? this.#width : height
    if (!classes || (classes instanceof Array && classes.length === 0)) {
      this.#classes = this.constructor.yolo_classes;
    } else {
      this.#classes = classes;
    }
  }

  update_classes(classes) {
    if (!classes || (classes instanceof Array && classes.length === 0)) {
      this.#classes = this.constructor.yolo_classes;
    } else {
      this.#classes = classes;
    }
  }

  async init(model) {
    console.log("开始加载模型")
    // 加载模型
    try {
      this.#session = await ort_webgpu.InferenceSession.create(model, {executionProviders: ["webgpu"]});
    } catch (e) {
      console.warn(e);
      this.#session = await ort.InferenceSession.create(model);
    }finally {
      console.log("模型加载结束")
    }
    return !this.empty();
  }

  async release() {
    if (this.empty()) return;
    console.log("release")
    await this.#session.release();
    this.#session = null;
  }

  async dispose(input) {
    input.data.dispose();
  }

  empty() {
    return !this.#session
  }

  /**
   * 不再使用之后，需要调用 dispose 释放
   * @param url
   * @returns {Promise<unknown>}
   */
  load_image(url) {
    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        let img = new Image();
        img.src = src;
        img.onload = async () => {
          const [img_width, img_height] = [img.width, img.height]
          let canvas = document.createElement("canvas");
          canvas.width = this.#width;
          canvas.height = this.#height;
          const context = canvas.getContext("2d");
          context.fillStyle = "#0033ff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          let [img_width_, img_height_] = [canvas.width, canvas.height * img.height / img.width];
          if (img.width < img.height) {
            [img_width_, img_height_] = [canvas.width * img.width / img.height, canvas.height];
          }
          context.drawImage(img, 0, 0, img_width_, img_height_);
          const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = imgData.data;
          const red = [], green = [], blue = [];
          await sleep(1);
          for (let index = 0; index < pixels.length; index += 4) {
            red.push(pixels[index] / 255.0);
            green.push(pixels[index + 1] / 255.0);
            blue.push(pixels[index + 2] / 255.0);
          }
          const input_ = [...red, ...green, ...blue];
          img = null;
          let input = new ort.Tensor(Float32Array.from(input_), [1, 3, canvas.width, canvas.height]);
          canvas.width = 1;
          canvas = null;
          resolve({
            data: input,
            width: img_width,
            height: img_height,
            inference_width: img_width_,
            inference_height: img_height_
          });
        }
        img.onerror = reject;
      })
    }
    if (url instanceof File) {
      return loadImage(URL.createObjectURL(url));
    } else if (typeof url === "string") {
      return loadImage(url);
    } else if (url instanceof HTMLImageElement) {
      return loadImage(url.src);
    }
    throw new Error("暂不支持")
  }

  /**
   * run and get boxs
   * @param input
   * @returns {Promise<*[]>} boxs
   */
  async run(input) {
    const outputs = await this.#session.run({images: input.data});
    let boxs = this.#process_output(outputs["output0"].data, input);
    outputs["output0"].dispose();
    return boxs;
  }

  /**
   * Function draws the image from provided file
   * and bounding boxes of detected objects on
   * top of the image
   * @param file Uploaded file object
   * @param boxes Array of bounding boxes in format [[x1,y1,x2,y2,object_type,probability],...]
   * @param canvas HTMLCanvasElement or canvas selector
   * @param font_size font size
   */
  draw_image_and_boxes(file, boxes, canvas, font_size = 16) {
    let url = file;
    if (file instanceof File) {
      url = URL.createObjectURL(file);
    } else if (file instanceof HTMLImageElement) {
      url = file.src;
    }

    const img = new Image()
    img.src = url;
    img.onload = () => {
      const canvas_ = canvas instanceof HTMLCanvasElement ? canvas : document.querySelector(canvas);
      canvas_.width = img.width;
      canvas_.height = img.height;
      const ctx = canvas_.getContext("2d");
      ctx.drawImage(img, 0, 0);
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 3;
      ctx.font = font_size + "px serif";
      boxes.forEach(([x1, y1, x2, y2, label]) => {
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        ctx.fillStyle = "#00ff00";
        // const width = ctx.measureText(label).width;
        // ctx.fillRect(x1, y1, width + 10, 25);
        // ctx.fillStyle = "#000000";
        ctx.fillText(label, x1, y1 - font_size / 3);
      });
    }
  }

  /**
   * Function used to convert RAW output from YOLOv8 to an array of detected objects.
   * Each object contain the bounding box of this object, the type of object and the probability
   * @param output Raw output of YOLOv8 network
   * @param input input
   * @returns Array of detected objects in a format [[x1,y1,x2,y2,object_type,probability],..]
   */
  #process_output(output, input) {
    let img_width = input.width * (this.#width / input.inference_width) / this.#width;
    let img_height = input.height * (this.#height / input.inference_height) / this.#height;

    let boxes = [];
    for (let index = 0; index < 8400; index++) {
      const [class_id, prob] = [...Array(80).keys()]
        .map(col => [col, output[8400 * (col + 4) + index]])
        .reduce((accum, item) => item[1] > accum[1] ? item : accum, [0, 0]);
      if (prob < this.#prob) {
        continue;
      }
      const label = this.#classes.hasOwnProperty(class_id) ? this.#classes[class_id] : class_id;
      const xc = output[index];
      const yc = output[8400 + index];
      const w = output[2 * 8400 + index];
      const h = output[3 * 8400 + index];
      const x1 = (xc - w / 2) * img_width;
      const y1 = (yc - h / 2) * img_height;
      const x2 = (xc + w / 2) * img_width;
      const y2 = (yc + h / 2) * img_height;
      boxes.push([x1, y1, x2, y2, label, prob, class_id, input.width, input.height]);
    }

    if (this.#fast_nms) {
      let arr = [];
      for (let i in boxes) {
        arr.push(new Point((boxes[i][0] + boxes[i][2]) / 2, (boxes[i][1] + boxes[i][3]) / 2, boxes[i][5], boxes[i]));
        // arr.push(new Point(boxes[i][0], boxes[i][1], boxes[i][5], boxes[i]));
      }
      arr = fastNMS(arr, 15);
      const result = [];
      for (let i = 0; i < arr.length; i++) {
        // [x1, y1, x2, y2, label, prob, class_id]
        // result.push(arr[i].arg);
        result.push(new BoxInfo(arr[i].arg));
      }
      return result;
    }
    {
      boxes = boxes.sort((box1, box2) => box2[5] - box1[5])
      const result = [];
      while (boxes.length > 0) {
        // [x1, y1, x2, y2, label, prob, class_id]
        result.push(new BoxInfo(boxes[0]));
        boxes = boxes.filter(box => this.constructor.iou(boxes[0], box) < 0.7);
      }
      return result;
    }
  }

  /**
   * Function calculates "Intersection-over-union" coefficient for specified two boxes
   * https://pyimagesearch.com/2016/11/07/intersection-over-union-iou-for-object-detection/.
   * @param box1 First box in format: [x1,y1,x2,y2,object_class,probability]
   * @param box2 Second box in format: [x1,y1,x2,y2,object_class,probability]
   * @returns Intersection over union ratio as a float number
   */
  static iou(box1, box2) {
    return this.intersection(box1, box2) / this.union(box1, box2);
  }

  /**
   * Function calculates union area of two boxes.
   *     :param box1: First box in format [x1,y1,x2,y2,object_class,probability]
   *     :param box2: Second box in format [x1,y1,x2,y2,object_class,probability]
   *     :return: Area of the boxes union as a float number
   * @param box1 First box in format [x1,y1,x2,y2,object_class,probability]
   * @param box2 Second box in format [x1,y1,x2,y2,object_class,probability]
   * @returns Area of the boxes union as a float number
   */
  static union(box1, box2) {
    const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
    const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
    const box1_area = (box1_x2 - box1_x1) * (box1_y2 - box1_y1)
    const box2_area = (box2_x2 - box2_x1) * (box2_y2 - box2_y1)
    return box1_area + box2_area - this.intersection(box1, box2)
  }

  /**
   * Function calculates intersection area of two boxes
   * @param box1 First box in format [x1,y1,x2,y2,object_class,probability]
   * @param box2 Second box in format [x1,y1,x2,y2,object_class,probability]
   * @returns Area of intersection of the boxes as a float number
   */
  static intersection(box1, box2) {
    const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
    const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
    const x1 = Math.max(box1_x1, box2_x1);
    const y1 = Math.max(box1_y1, box2_y1);
    const x2 = Math.min(box1_x2, box2_x2);
    const y2 = Math.min(box1_y2, box2_y2);
    return (x2 - x1) * (y2 - y1)
  }

  /**
   * Array of YOLOv8 class labels
   */
  static get yolo_classes() {
    return [
      'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
      'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse',
      'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase',
      'frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard',
      'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
      'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant',
      'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven',
      'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
    ];
  }
}
