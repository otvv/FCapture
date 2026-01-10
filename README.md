# FCapture

FCapture is a previewer _(and a eventually a recorder)_ software for generic (off-brand) USB capture cards. FCapture is made entirely using Electron and native web APIs _(webgl, canvas2d and mediadevices)_.
This app is meant for the people that doesn't want to use a third-party software such as OBS or VLC just to preview the capture card's video output. _(I know that with OBS you can record your gameplay, but I feel like some people might want a dedicated app just for their capture card.)_

My goal with this app is to make an open-source alternative for anyone to use.

### Key features

- Preview video output from generic USB capture cards _(and possibly PCI-E ones)_
- The ability to change stream/video mode (webgl or canvas2d) change video and audio quality _(based on device capabilities)_ and more
- Take screenshots of your gameplay/output at any time _(NOTE: recording will be implemented at a later date)_
- Since this is an Electron based app, FCapture also works on multiple platforms, the app can run on macOS, Linux and Windows

### Screenshots

![Preview Image 1](repo/images/image2.png)

<details>
  <summary>Click to expand for more images:</summary>

  ![Preview Image 2](repo/images/image1.png)
  ![Preview Image 3](repo/images/image3.png)
  ![Preview Image 4](repo/images/image4.png)

</details>

***


## Installation (for Contributors)

This app is under heavily development and its subject to change. So if you want to contribute or report any bugs, feel free to make a pull-request!

1. Clone the repository:
```sh
  git clone https://github.com/otvv/fcapture.git
  cd fcapture
```

2. Install dependencies:
```sh
npm install
```

3. Run or build the app:
```sh
# run the app locally 
npm start
```
```sh
# build the app using the appropriate script based on your platform (OS)
npm run build

# there's also alternative build scripts in case the normal method doesn't work.
npm run buildAltUnix # (macOS and Linux using bash)
npm run buildAltWin # (Windows using PowerShell)

# if you need to sign the app on macOS separately run:
npm run signAppMac # this will use the "adhoc" signing method.

# NOTE: If you get errors while trying to build the app, install 'electron-builder' as a global package
npm install -g electron-builder
```

**NOTE**: The build script file will also throw errors if there's a dependency missing. _(It will tell you which one and how to install it)_

***

### LICENSE:

This project is licensed under the Apache-2.0 License. See the [LICENSE](./LICENSE) file for details.
