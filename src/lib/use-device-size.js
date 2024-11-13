import {createEffect, createSignal} from "solid-js";

const UseDeviceSize = () => {
  const [width, setWidth] = createSignal(0)
  const [height, setHeight] = createSignal(0)

  const handleWindowResize = () => {
    setWidth(window.innerWidth);
    setHeight(window.innerHeight);
  }

  createEffect(() => {
    // component is mounted and window is available
    handleWindowResize();

    window && window.addEventListener('resize', handleWindowResize);

    // unsubscribe from the event on component unmount
    return () => window && window.removeEventListener('resize', handleWindowResize);
  });
  const watch = width;
  return {width, height, watch};
}

export default UseDeviceSize;
