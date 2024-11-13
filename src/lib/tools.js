window._tools_inited = window._tools_inited || false;
if (!window._tools_inited) {
  (function Tools() {
    window._tools_inited = true;
    /**
     * @return {string}
     */
    let StringToString = function (args) {
      if (arguments.length > 0) {
        let result = this;
        if (arguments.length === 1 && typeof (args) === "object") {
          for (let key in args) {
            let reg = new RegExp("({" + key + "})", "g");
            result = result.replace(reg, args[key]);
          }
        } else {
          for (let i = 0; i < arguments.length; i++) {
            if (arguments[i] === undefined) {
              return "";
            } else {
              let reg = new RegExp("({[" + i + "]})", "g");
              result = result.replace(reg, arguments[i]);
            }
          }
        }
        return result;
      } else {
        return this;
      }
    };
    Object.defineProperty(String.prototype, "format", {
      enumerable: false,
      configurable: false,
      get: function getter() {
        return StringToString.bind(this);
      }
    });
    Object.defineProperty(String.prototype, "toDate", {
      enumerable: false,
      configurable: false,
      get: function getter() {
        let that = this;
        return function () {
          return new Date(Date.parse(that));
        };
      }
    });
    Object.defineProperty(String.prototype, "toBuffer", {
      enumerable: false, configurable: false, get: function getter() {
        let str = this;
        return function () {
          if (!str) return;
          let val = "";
          for (let i = 0; i < str.length; i++) {
            val += str.charCodeAt(i).toString(16);
          }
          str = val;
          val = "";
          let length = str.length;
          let index = 0;
          let array = []
          while (index < length) {
            array.push(str.substring(index, index + 2));
            index = index + 2;
          }
          val = array.join(",");
          // 将16进制转化为ArrayBuffer
          return new Uint8Array(val.match(/[\da-f]{2}/gi).map(function (h) {
            return parseInt(h, 16)
          }))
        };
      }
    });
    Object.defineProperty(String.prototype, "toArrayBuffer", {
      enumerable: false, configurable: false, get: function getter() {
        let str = this;
        return function () {
          if (!str) return;
          return str.toBuffer().buffer
        };
      }
    });
    Object.defineProperty(String.prototype, "copy", {
      enumerable: false,
      configurable: false,
      get: function getter() {
        let that = this;
        return async function () {
          let self = this;
          try {
            await navigator.clipboard.writeText(that);
          } catch (e) {
            // 创建一个 Input标签
            const cInput = document.createElement('input')
            cInput.value = that
            document.body.appendChild(cInput)
            cInput.select() // 选取文本域内容;
            // 执行浏览器复制命令
            // 复制命令会将当前选中的内容复制到剪切板中（这里就是创建的input标签）
            // Input要在正常的编辑状态下原生复制方法才会生效
            document.execCommand('Copy')
            /// 复制成功后再将构造的标签 移除
            cInput.remove()
          }
        };
      }
    });

    Object.defineProperty(Object.prototype, "kClone", {
      enumerable: false,
      configurable: false,
      get: function getter() {
        let that = this;
        return () => {
          return JSON.parse(JSON.stringify(that))
        };
      }
    });


    let DateAdd_O = {
      "y+": function (that, offset) {
        that.setFullYear(that.getFullYear() + offset);
      }, //月份
      "M+": function (that, offset) {
        that.setMonth(that.getMonth() + offset);
      }, //月份
      "d+": function (that, offset) {
        that.setDate(that.getDate() + offset);
      }, //日
      "h+": function (that, offset) {
        that.setHours(that.getHours() + offset);
      }, //小时
      "m+": function (that, offset) {
        that.setMinutes(that.getMinutes() + offset);
      }, //分
      "s+": function (that, offset) {
        that.setSeconds(that.getSeconds() + offset);
      }, //秒
      "S": function (that, offset) {
        that.setMilliseconds(that.getMilliseconds() + offset);
      } //毫秒
    };
    let DateAddTo = function (type, offset) {
      switch (type) {
        case "y":
          DateAdd_O["y+"](this, offset);
          break;
        case "M":
          DateAdd_O["M+"](this, offset);
          break;
        case "d":
          DateAdd_O["d+"](this, offset);
          break;
        case "h":
          DateAdd_O["h+"](this, offset);
          break;
        case "m":
          DateAdd_O["m+"](this, offset);
          break;
        case "s":
          DateAdd_O["s+"](this, offset);
          break;
        case "S":
          DateAdd_O["S"](this, offset);
          break;
        default:
          break;
      }
      return this;
    };

    /**
     * @return {string}
     */
    let DateToString = function (fmt) {
      if (!fmt) {
        return this.toString();
      }

      for (let k in DateAdd_O)
        if (new RegExp(k + "([\\+-]{1}\\d+)+").test(fmt)) {
          let ret = new RegExp(k + "([\\+-]{1}\\d+)+").exec(fmt);
          // let offset = parseInt(RegExp.$1);
          let offset = parseInt(ret[1]);
          this.Add(k[0], offset);
          // fmt = fmt.replace(RegExp.$1, "");
          fmt = fmt.replace(ret[1], "");
        }


      let o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
      };
      if (/(y+)/.test(fmt)) {
        let ret = /(y+)/.exec(fmt);
        // fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substring(4 - RegExp.$1.length));
        fmt = fmt.replace(ret[1], (this.getFullYear() + "").substring(4 - ret[1].length));
      }
      for (let k in o)
        if (new RegExp("(" + k + ")").test(fmt)) {
          let ret = new RegExp("(" + k + ")").exec(fmt);
          // fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).substring(("" + o[k]).length)));
          fmt = fmt.replace(ret[1], (ret[1].length === 1) ? (o[k]) : (("00" + o[k]).substring(("" + o[k]).length)));
        }
      return fmt;
    };

    Object.defineProperty(Date.prototype, "format", {
      enumerable: false,
      configurable: false,
      get: function getter() {
        return DateToString.bind(this);
      },
      set: function (val) {
        console.log("Date.prototype.format", val);
      }
    });
    Object.defineProperty(Date.prototype, "Add", {
      enumerable: false,
      configurable: false,
      get: function getter() {
        return DateAddTo.bind(this);
      }
    });


    let DateParse = Date.parse;
    let DateParseFmt = /\D*(\d*)\D*(\d*)\D*(\d*)\D*(\d*)\D*(\d*)\D*(\d*)\D*/g;
    Date.parse = function (DateString) {
      let date = DateParse.bind(this)(DateString);
      if (!date) {
        let result = new RegExp(DateParseFmt).exec(DateString);
        if (result != null) {
          for (let i = 1; i < result.length; i++) {
            result[i] = parseInt(result[i]);
            if (!result[i]) {
              result[i] = 0;
            }
          }
          date = new Date(parseInt(result[1]), result[2] - 1, parseInt(result[3]), parseInt(result[4]), parseInt(result[5]), parseInt(result[6])).getTime();
        }
      }
      return date;
    };
  })();
}
