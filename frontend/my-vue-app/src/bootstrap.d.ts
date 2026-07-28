declare module 'bootstrap/js/dist/carousel' {
  type CarouselOptions = {
    interval?: number | boolean;
    pause?: 'hover' | false;
    ride?: 'carousel' | boolean;
    touch?: boolean;
  };

  class Carousel {
    static getOrCreateInstance(
      element: Element,
      config?: CarouselOptions,
    ): Carousel;
    cycle(): void;
    dispose(): void;
  }

  export default Carousel;
}
