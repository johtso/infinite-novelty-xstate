/**
 * AuthorizationModal class
 */

export class AuthorizationModal {
  private url: string
  private features: { [key: string]: string | number }
  private width = 500
  private height = 600
  private modal!: Window | null

  constructor(url: string) {
    // Window modal URL
    this.url = url

    const { left, top, computedWidth, computedHeight } = this.layout(this.width, this.height)

    // Window modal features
    this.features = {
      width: computedWidth,
      height: computedHeight,
      top,
      left,
      scrollbars: 'yes',
      resizable: 'yes',
      // noopener: 'no'
      //
      // Note: using "noopener=yes" seems safer here, as the modal will run on third-party websites.
      // But we need detect if the modal has been closed by the user, during the authorization process,
      // To do so, we are polling the modal status of the modal (using the read-only closed property).
      // If we can find a workaround that provides both the ability to use "noopener=yes"
      // and detect the modal close status, it will be safer to proceed so.
      status: 'no',
      toolbar: 'no',
      location: 'no',
      copyhistory: 'no',
      menubar: 'no',
      directories: 'no'
    }
  }

  /**
   * The modal is expected to be in the center of the screen.
   */

  layout(expectedWidth: number, expectedHeight: number) {
    const screenWidth = window.screen.width
    const screenHeight = window.screen.height
    const left = screenWidth / 2 - expectedWidth / 2
    const top = screenHeight / 2 - expectedHeight / 2

    const computedWidth = Math.min(expectedWidth, screenWidth)
    const computedHeight = Math.min(expectedHeight, screenHeight)

    return { left: Math.max(left, 0), top: Math.max(top, 0), computedWidth, computedHeight }
  }

  /**
   * Open the modal
   */

  open() {
    const url = this.url
    const windowName = ''
    const windowFeatures = this.featuresToString()
    this.modal = window.open(url, windowName, windowFeatures)
    return this.modal
  }

  /**
   * Add event listener on the modal
   */

  addEventListener(eventType: string, handler: () => any): void {
    if (eventType !== 'close') {
      return
    }

    if (!this.modal) {
      handler()
      return
    }

    const interval = window.setInterval(() => {
      if (!this.modal || this.modal.closed) {
        handler()
        window.clearInterval(interval)
      }
    }, 100)
  }

  /**
   * Helper to convert the features object of this class
   * to the comma-separated list of window features required
   * by the window.open() function.
   */

  featuresToString(): string {
    const features = this.features
    const featuresAsString: string[] = []

    for (let key in features) {
      featuresAsString.push(key + '=' + features[key])
    }

    return featuresAsString.join(',')
  }
}
