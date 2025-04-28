import { ElementSides, isInViewport } from './is-in-viewport';
import Mock = jest.Mock;

describe('IsInViewport', () => {
  let htmlElement: HTMLElement;
  let sidesToTest: ElementSides;
  const initialClientRect = {
    top: 137,
    bottom: 255,
    left: 40,
    right: 631,
  } as DOMRect;

  beforeEach(() => {
    htmlElement = {
      getBoundingClientRect: jest.fn().mockReturnValue({
        ...initialClientRect,
      }),
    } as unknown as HTMLElement;
    Object.defineProperties(window, {
      innerWidth: {
        value: 800,
      },
      innerHeight: {
        value: 600,
      },
    });
  });

  const testWithRectangle = (rectangle: Partial<DOMRect>, expectedResult: boolean) => {
    (htmlElement.getBoundingClientRect as Mock).mockReturnValue({
      ...initialClientRect,
      ...rectangle,
    } as DOMRect);

    const actualResult = isInViewport(htmlElement, sidesToTest);

    expect(actualResult).toBe(expectedResult);
  };

  it('should check if top is visible', () => {
    sidesToTest = ElementSides.Top;

    testWithRectangle({}, true);
    testWithRectangle({ top: -100 }, false);
    testWithRectangle({ bottom: 700 }, true);
    testWithRectangle({ left: -10 }, false);
    testWithRectangle({ right: 900 }, false);
  });

  it('should check if bottom is visible', () => {
    sidesToTest = ElementSides.Bottom;

    testWithRectangle({}, true);
    testWithRectangle({ top: -100 }, true);
    testWithRectangle({ bottom: 700 }, false);
    testWithRectangle({ left: -10 }, false);
    testWithRectangle({ right: 900 }, false);
  });

  it('should check if the whole element is visible', () => {
    sidesToTest = ElementSides.All;

    testWithRectangle({}, true);
    testWithRectangle({ top: -100 }, false);
    testWithRectangle({ bottom: 700 }, false);
    testWithRectangle({ left: -10 }, false);
    testWithRectangle({ right: 900 }, false);
  });

  it('should default to all sides when "sidesToCheck" argument is omitted', () => {
    sidesToTest = undefined;

    testWithRectangle({}, true);
    testWithRectangle({ top: -100 }, false);
    testWithRectangle({ bottom: 700 }, false);
    testWithRectangle({ left: -10 }, false);
    testWithRectangle({ right: 900 }, false);
  });
});
