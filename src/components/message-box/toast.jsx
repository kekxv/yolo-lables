import {children, createEffect, For, Show} from "solid-js";
import {Motion} from "solid-motionone";

function typeClass(type) {
  switch (type) {
    case "info":
      return "text-blue-800 border-blue-300 bg-blue-50";
    case "danger":
      return "text-red-800 border-red-300 bg-red-50";
    case "success":
      return "text-green-800 border-green-300 bg-green-50";
    case "warning":
      return "text-yellow-800 border-yellow-300 bg-yellow-50";
    default :
      return "text-gray-800 border-gray-300 bg-gray-50";
  }
}

export default function (props) {
  const messages = children(() => props.messages);
  let timeout = 0;
  createEffect(() => {
    if (messages().length > 0) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        props.clear?.();
      }, 1500);
    }
  })

  return (
    <Show when={messages().length > 0}>
      <div className={`fixed z-50 top-5 left-5 right-5`}>
        <For each={messages()}>
          {(item, index) =>
            <Motion
              initial={{opacity: 0, scale: 0.6}}
              animate={{opacity: 1, scale: 1}}
              exit={{opacity: 0, scale: 0.6}}
              transition={{duration: 0.3}}
            >
              <div
                className={`w-full max-w-xl m-auto flex items-center p-3 mb-4 border rounded-lg text-sm ${typeClass(item.type)}`}
                role="alert">
                <svg className="flex-shrink-0 inline w-4 h-4 me-3" aria-hidden="true"
                     xmlns="http://www.w3.org/2000/svg"
                     fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
                </svg>
                <span className="sr-only">Info</span>
                <div>
                  {item.message}
                </div>
              </div>
            </Motion>
          }
        </For>
      </div>
    </Show>
  )
}
