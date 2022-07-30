import Engine from "./lib/hc03lib"
const PATH_WORKER = "work.bundle.js";
const ele = document.querySelector("#root");

const engine = Engine.getEngine(PATH_WORKER);

let bleDevices = null;
let bleCommandCharacteristic = null;
let bleNotifyCharacteristic = null;
let bleFIRMWARECharacteristic = null;
let bleHARDWARECharacteristic = null;
let bleSOFTWARECharacteristic = null;
let ecgList = Array.of();
let waveList = Array.of();
let isEcgBgDraw = false;
let xs = 0;
let speedX = 0;
let yScale = 0;

let count = 30;
let startCount = false;
let canvas = null;
let ctx = null;

const Detection = {
    BP: "Blood Pressure",
    BT: "Blood Temperature",
    BG: "Blood Glucose",
    OX: "Blood Oxygen",
    ECG: "Electrocardiogram",
    HRV: "Heart Rate Variability",
    CHOL: "Cholestenone",
    UA: "Uric Acid",
    BATTERY : "Battery",
    DEVICE_INFO : "device",
}

const Process = {
    START: 0,
    RESUME: 1,
    OPERATION: 2,
    PAUSE: 3,
    END: 4,
}

//ble
engine.registBLEListener({
    onException: (err) => {
        const {
            code,
            message
        } = err;
        console.log("code=   ", code);
        console.log("message=   ", message);
    },
});

// //血氧
engine.registOXListener({
    onProcess: (type, data) => {
        if (type === Process.START) {
            waveList = [];
        } else if (type === Process.END) {
            // eslint-disable-next-line no-use-before-define
            drawOxBackground();
            document.querySelector("#spo2").textContent = "";
            document.querySelector("#hr").textContent = "";
        }
        if (bleCommandCharacteristic !== null) {
            bleCommandCharacteristic.writeValue(data);
        }
    },
    onException: (err) => {
        console.log(`error:${err}`);
    },
    onResult: (spo2, hr) => {
        document.querySelector("#spo2").textContent = String(Math.round(spo2));
        document.querySelector("#hr").textContent = String(Math.round(hr));
    },
    onRawResult: (red, _ir) => {
        if (red) {
            waveList.push(red);
            if (waveList.length > 600) {
                waveList.shift();
            }
            // eslint-disable-next-line no-use-before-define
            requestWaveLayout();
        }
    },
});

//体温
engine.registBTListener({
    onProcess: (type, data) => {
        console.log(
            `type:${type},data:${data},bleCommandCharacteristic:${bleCommandCharacteristic}`
        );
        if (bleCommandCharacteristic !== null) {
            Promise.resolve(bleCommandCharacteristic)
                .then((ble) => {
                    ble.writeValue(data);
                })
                .catch((err) => {
                    console.log(`error:`, err);
                });
            // bleCommandCharacteristic.writeValue(data);
        }
    },
    onException: (err) => {
        console.log(`error:${err}`);
    },
    onResult: (temp) => {
        document.querySelector("#temp").textContent = String(temp);
        console.log(`tep:${temp}`);
    },
});

engine.registBPListener({
    onProcess: (type, data) => {
        console.log(`type:${type},data:${data}=`, data);
        if (type === Process.END) {
            Promise.resolve(bleCommandCharacteristic).then((ble) => {
                setTimeout(() => {
                    ble.writeValue(data);
                }, 1000);
            });
        } else if (bleCommandCharacteristic !== null) {
            Promise.resolve(bleCommandCharacteristic)
                .then((ble) => {
                    ble.writeValue(data);
                })
                .catch((err) => {
                    console.log(`error:`, err);
                });
            // bleCommandCharacteristic.writeValue(data);
        }
    },
    onException: (err) => {
        console.log(`error:${err}`);
    },
    onResult: (result) => {
        document.querySelector("#so").textContent = String(
            Math.floor(result.ps)
        );
        document.querySelector("#sz").textContent = String(
            Math.floor(result.pd)
        );
        document.querySelector("#hr1").textContent = String(
            Math.floor(result.hr)
        );
    },
});
//心电
engine.registECGListener({
    onProcess: (type, data) => {
        console.log(
            `type:${type},data:${data},bleCommandCharacteristic:${bleCommandCharacteristic}`
        );
        if (bleCommandCharacteristic !== null) {
            bleCommandCharacteristic.writeValue(data);
        }
    },
    onException: (err) => {
        console.log(`error:${err}`);
    },
    onFilterResult: (data, start) => {
        if (!isEcgBgDraw) {
            // eslint-disable-next-line no-use-before-define
            isEcgBgDraw = drawECGBackground();
            // requestAnimationFrame(requestECGWaveLayout)
        }
        if (data) {
            if (start === 0) {
                // eslint-disable-next-line no-use-before-define
                resetECGUIState();
            }
            if (startCount) {
                // eslint-disable-next-line no-undef
                // eslint-disable-next-line no-use-before-define
                updataECGUI(data);
            }
        }

    },

    onRawResult: (raw) => {
        console.log(`raw:${raw}`);
    },

    onPPI: (data) => {
        if (startCount) {
            document.querySelector("#ppi").textContent = String(data);
        }
        // console.log(`data:${data}`);
    },

    onPP:(data) =>{
        if (startCount) {
            document.querySelector("#pp").textContent = String(data);
        }
    },

    onHR: (data) => {
        if (startCount) {
            document.querySelector("#Hr").textContent = String(data);
        }
        console.log(`data:${data}`);
    },

    onHRV: (data) => {
        if (startCount) {
            document.querySelector("#hrv").textContent = String(data);
        }
        console.log(`data:${data}`);
    },

    onSDNN: (data) => {
        if (startCount) {
            document.querySelector("#sdnn").textContent = String(data);
        }
        console.log(`data:${data}`);
    },

    onRMSSD: (data) => {
        if (startCount) {
            document.querySelector("#rmssd").textContent = String(data);
        }
        console.log(`data:${data}`);
    },

    onSDNNIndex: (data) => {
        if (startCount) {
            document.querySelector("#sdnn_index").textContent = String(data);
        }
        console.log(`data:${data}`);
    },

    onMEAN: (data) => {
        if (startCount) {
            document.querySelector("#mean").textContent = String(data);
        }
        console.log(`data:${data}`);
    },

    onSTD: (data) => {
        if (startCount) {
            document.querySelector("#std").textContent = String(data);
        }
        console.log(`data:${data}`);
    },

    onFingerdetection: (touch) => {
        console.log("  touch", `${touch}  count=${count}`);
        if (!touch && count !== 0 && count !== 30) {
            startCount = false;
            // eslint-disable-next-line no-use-before-define
            NoTouchTip();
        }
        console.log(`touch:${touch}`);
    },
});

engine.registBatteryListener({
    onProcess: (_type, data) => {
        if (bleCommandCharacteristic !== null) {
            bleCommandCharacteristic.writeValue(data);
        }
    },
    onException: (err) => {
        const {
            code,
            message
        } = err;
        console.log("code=   ", code);
        console.log("message=   ", message);
    },
    onPowerResult: (data) => {
        document.querySelector("#power").textContent = String(data);
        console.log(` data=${data}`);
    },

    onPowerFull: () => {
        console.log(` powerFull`);
    },
    onPowerChange: () => {
        console.log(` powerChange`);
    },
});

engine.registDeviceListener({
    onProcess: (_type, data) => {
        if (bleCommandCharacteristic !== null) {
            bleCommandCharacteristic.writeValue(data);
        }
    },
    onException: (err) => {
        const {
            code,
            message
        } = err;
    },

    onDeviceInfo: (data) => {
        const {
            prodYear,
            prodMonth,
            deviceId,
            deviceKey,
            factory,
            reserved,
            deviceType,
            aKey,
            jsVersion,
        } = data;
        document.querySelector("#p_y").textContent = String(prodYear);
        document.querySelector("#p_m").textContent = String(prodMonth);
        document.querySelector("#d_id").textContent = String(deviceId);
        document.querySelector("#d_key").textContent = String(deviceKey);
        document.querySelector("#d_fa").textContent = String(factory);
        document.querySelector("#d_re").textContent = String(reserved);
        document.querySelector("#d_ty").textContent = String(deviceType);
        document.querySelector("#d_ak").textContent = String(aKey);
        document.querySelector("#j_v").textContent = String(jsVersion);
    },
});


document.getElementById("ble_device").addEventListener(
	// alert('salman');
    "click",
    // eslint-disable-next-line func-names
    function () {
        console.log("ble_device");
        // eslint-disable-next-line no-use-before-define
        if (isWebBluetoothEnable()) {
            // eslint-disable-next-line no-use-before-define
            requestDevice();
        }
    },
    false
);

// eslint-disable-next-line func-names
document.getElementById("ble_connect").addEventListener("click", function () {
    // eslint-disable-next-line no-use-before-define
    if (isWebBluetoothEnable) {
        // eslint-disable-next-line no-use-before-define
        connectDevicesAndCacheCharacteristices();
    }
});

document
    .getElementById("ble_device_version")
    // eslint-disable-next-line func-names
    .addEventListener("click", function () {
        // eslint-disable-next-line no-use-before-define
        if (isWebBluetoothEnable) {
            // eslint-disable-next-line no-use-before-define
            getDevicesVersion();
        }
    });

document
    .getElementById("ble_ox")
    // eslint-disable-next-line func-names
    .addEventListener("click", function () {
        // eslint-disable-next-line no-use-before-define
        if (isWebBluetoothEnable) {
            // eslint-disable-next-line no-undef
            // eslint-disable-next-line no-use-before-define
            startDetect(Detection.OX);
        }
    });

document
    .getElementById("ble_temp_start")
    // eslint-disable-next-line func-names
    .addEventListener("click", function () {
        // eslint-disable-next-line no-use-before-define
        if (isWebBluetoothEnable) {
            // eslint-disable-next-line no-undef
            // eslint-disable-next-line no-use-before-define
            startDetect(Detection.BT);
        }
    });

document
    .getElementById("ble_ecg")
    // eslint-disable-next-line func-names
    .addEventListener("click", function () {
        // eslint-disable-next-line no-use-before-define
        if (isWebBluetoothEnable) {
            // eslint-disable-next-line no-undef
            // eslint-disable-next-line no-use-before-define
            startDetect(Detection.ECG);
        }
    });

document
    .getElementById("ble_ecg_end")
    // eslint-disable-next-line func-names
    .addEventListener("click", function () {
        // eslint-disable-next-line no-use-before-define
        if (isWebBluetoothEnable) {
            // eslint-disable-next-line no-undef
            // eslint-disable-next-line no-use-before-define
            stopDetect(Detection.ECG);
        }
    });
document
    .getElementById("ble_bp")
    // eslint-disable-next-line func-names
    .addEventListener("click", function () {
        // eslint-disable-next-line no-use-before-define
        if (isWebBluetoothEnable) {
            // eslint-disable-next-line no-undef
            // eslint-disable-next-line no-use-before-define
            startDetect(Detection.BP);
        }
    });


document
    .getElementById("ble_ox_end")
    // eslint-disable-next-line func-names
    .addEventListener("click", function () {
        // eslint-disable-next-line no-use-before-define
        if (isWebBluetoothEnable) {
            // eslint-disable-next-line no-undef
            // eslint-disable-next-line no-use-before-define
            stopDetect(Detection.OX);
        }
    });
document
    .getElementById("ble_bp_end")
    // eslint-disable-next-line func-names
    .addEventListener("click", function () {
        // eslint-disable-next-line no-use-before-define
        if (isWebBluetoothEnable) {
            // eslint-disable-next-line no-undef
            // eslint-disable-next-line no-use-before-define
            stopDetect(Detection.BP);
        }
    });

document.getElementById("ble_battery").addEventListener(
    "click",
    // eslint-disable-next-line func-names
    function () {
        // eslint-disable-next-line no-use-before-define
        if (isWebBluetoothEnable()) {
            // eslint-disable-next-line no-use-before-define
            startDetect(Detection.BATTERY);
        }
    }
);

document.getElementById("ble_device_info").addEventListener(
    "click",
    // eslint-disable-next-line func-names
    function () {
        // eslint-disable-next-line no-use-before-define
        if (isWebBluetoothEnable()) {
            // eslint-disable-next-line no-use-before-define
            startDetect(Detection.DEVICE_INFO);
        }
    }
);

function startDetect(type) {
    console.log(`startDetect:${bleCommandCharacteristic == null}`);
    if (bleCommandCharacteristic) {
        Promise.resolve(bleCommandCharacteristic)
            .then(() => {
                engine.startDetect(type);
            })
            .then((_) => {
                console.log("startDetect value has been reset");
            })
            .catch((err) => {
                console.log(`startDetect error:${err.stack}`);
            });
    }
}

function stopDetect(type) {
    if (bleCommandCharacteristic) {
        Promise.resolve(bleCommandCharacteristic)
            .then(() => {
                engine.stopDetect(type);
            })
            .then((_) => {
                console.log("startDetect value has been reset");
            })
            .catch((err) => {
                console.log(`startDetect error:${err.stack}`);
            });
    }
}
self.setInterval(function () {
    if (startCount) {
        count--;
        if (count <= 0) {
            count = 0;
            startCount = false;
        }
        document.querySelector("#downCount").textContent = String(count);
    } else {
        count = 30;
    }
}, 1000);

function resetECGUIState() {
    document.querySelector("#ppi").textContent = "";
    document.querySelector("#Hr").textContent = "";
    document.querySelector("#hrv").textContent = "";
    document.querySelector("#sdnn").textContent = "";
    document.querySelector("#rmssd").textContent = "";
    document.querySelector("#sdnn_index").textContent = "";
    document.querySelector("#mean").textContent = "";
    document.querySelector("#std").textContent = "";
    document.querySelector("#downCount").textContent = "";
    startCount = true;
    ecgList = [];
    count = 30;
}

function updataECGUI(outData) {
    // eslint-disable-next-line no-use-before-define
    const Ydata = getY(outData);

    ecgList.push(Ydata);
    if (ecgList.length * speedX > 600) {
        ecgList.shift();
    }
    // eslint-disable-next-line no-use-before-define
    requestECGWaveLayout();
}

function getY(data) {
    const canvas = document.getElementById("wave_e");
    const height = canvas.height;
    if (xs === 0) {
        // eslint-disable-next-line no-use-before-define
        xs = getxS();
    }
    if (yScale === 0) {
        // eslint-disable-next-line no-use-before-define
        yScale = getYScale(2);
    }
    // console.log("  height="+height+"  getxS()="+xs+"  getYScale(2)="+yScale)
    return height / 2 - ((((data * 18.3) / 128) * xs) / 100) * yScale;
}

function getSpeed() {
    const DATA_PER_SEC = 512;
    // eslint-disable-next-line no-use-before-define
    const scale = getXScale(1);
    // let p25=new ToolUtils.unitConversion().mmConversionPx(25)
    const dataPerLattice = DATA_PER_SEC / (25 * scale);
    // eslint-disable-next-line no-use-before-define
    return getxS() / dataPerLattice;
}

function getYScale(type) {
    let scale = 0;
    // eslint-disable-next-line default-case
    switch (type) {
        case 1:
            scale = 0.5; //5mm/mV
            break;
        case 2:
            scale = 1; //10mm/mV
            break;
        case 3:
            scale = 2; //20mm/mV
            break;
    }
    return scale;
}

function getxS() {
    const spac1 = mmConversionPx(1);
    return spac1;
}

function getXScale(type) {
    let scale = 0;
    // eslint-disable-next-line default-case
    switch (type) {
        case 1:
            scale = 1; //25mm/s
            break;
        case 2:
            scale = 2; //50mm/s
            break;
    }
    return scale;
}

function NoTouchTip() {
    let txt;
    engine.stopDetect(Detection.ECG);
    // eslint-disable-next-line no-alert
    const r = confirm("手指已离开设备，请重新测量");
    if (r === true) {
        txt = "You pressed OK!";
        // eslint-disable-next-line no-use-before-define
        dialogConfirm();
    } else {
        txt = "You pressed Cancel!";
    }
}

function dialogConfirm() {
    resetECGUIState();
    startCount = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    engine.startDetect(Detection.ECG);
}

function drawECGBackground() {
    const canvas = document.getElementById("wave_e_bg");
    const ctx = canvas.getContext("2d");
    if (ctx == null) {
        return false;
    }
    // const path = new Path2D();

    const spac5 = mmConversionPx(5);
    const spac1 = mmConversionPx(1);
    const widthCount5 = canvas.width / spac5;
    const heightCount5 = canvas.height / spac5;
    const widthCount1 = canvas.width / spac1;
    const heightCount1 = canvas.height / spac1;

    ctx.strokeStyle = "#3c3d42";

    for (let i = 1; i < widthCount1; i++) {
        // if(i%5!=0){
        ctx.moveTo(i * spac1 + 0.5, 0);
        ctx.lineTo(i * spac1 + 0.5, canvas.height);
        // }
    }
    for (let j = 1; j < heightCount1; j++) {
        // if(j%5!=0){
        ctx.moveTo(0, j * spac1 + 0.5);
        ctx.lineTo(canvas.width, j * spac1 + 0.5);
        // }
    }
    // return path
    ctx.stroke();
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "000000";
    for (let i = 1; i < widthCount5; i++) {
        ctx.moveTo(i * spac5 + 0.5, 0);
        ctx.lineTo(i * spac5 + 0.5, canvas.height);
    }
    for (let j = 1; j < heightCount5; j++) {
        ctx.moveTo(0, j * spac5 + 0.5);
        ctx.lineTo(canvas.width, j * spac5 + 0.5);
    }
    ctx.stroke();
    return true;
}

function requestECGWaveLayout() {
    if (ecgList.length === 0) {
        return;
    }
    if (canvas == null) {
        canvas = document.getElementById("wave_e");
        ctx = canvas.getContext("2d");
    }
    if (ctx == null) {
        return;
    }
    if (speedX === 0) {
        speedX = getSpeed();
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#f6b800";
    const path = new Path2D();

    // eslint-disable-next-line func-names
    ecgList.forEach((value, index, _array) => {
        path.lineTo(speedX * index, value);
    });
    ctx.stroke(path);
}

function drawOxBackground() {
    const canvas = document.getElementById("wave_bg");
    const ctx = canvas.getContext("2d");
    if (ctx == null) {
        return;
    }
    ctx.strokeStyle = "#222222";
    ctx.moveTo(0, 0);
    ctx.lineTo(0, canvas.height);
    ctx.stroke();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
}

function requestWaveLayout() {
    if (waveList.length === 0) {
        return;
    }
    const canvas = document.getElementById("wave");
    const ctx = canvas.getContext("2d");
    if (ctx == null) {
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.strokeStyle = "#222222";
    // ctx.moveTo(0, 0);
    // ctx.lineTo(0, canvas.height);
    // ctx.stroke();
    // ctx.moveTo(0, canvas.height / 2);
    // ctx.lineTo(canvas.width, canvas.height / 2);
    // ctx.stroke();

    const redPath = new Path2D();
    redPath.moveTo(0, canvas.height / 2);
    const irPath = new Path2D();
    irPath.moveTo(0, canvas.height / 2);

    waveList.forEach((value, index, _) => {
        const {
            min,
            max,
            wave
        } = value;
        const dp = Math.abs(max - min) / 75;
        redPath.lineTo(1 * index, 125 - (wave * -1 - min) / dp);
    });

    ctx.strokeStyle = "#00ff33";
    ctx.stroke(redPath);
}

function conversion_getDPI() {
    // eslint-disable-next-line no-array-constructor
    const arrDPI = new Array();

    const tmpNode = document.createElement("DIV");
    tmpNode.style.cssText =
        "width:1in;height:1in;position:absolute;left:0px;top:0px;z-index:99;visibility:hidden";
    document.body.appendChild(tmpNode);
    // eslint-disable-next-line radix
    arrDPI[0] = parseInt(tmpNode.offsetWidth.toString());
    // eslint-disable-next-line radix
    arrDPI[1] = parseInt(tmpNode.offsetHeight.toString());
    tmpNode.parentNode.removeChild(tmpNode);

    return arrDPI;
}
/**
 * px转换为mm
 * @param value
 * @returns {number}
 */

function pxConversionMm(value) {
    const inch = value / conversion_getDPI()[0];
    // eslint-disable-next-line camelcase
    const c_value = inch * 25.4;
    //      console.log(c_value);
    // eslint-disable-next-line camelcase
    return c_value;
}
/**
 * mm转换为px
 * @param value
 * @returns {number}
 */
function mmConversionPx(value) {
    const inch = value / 25.4;
    // eslint-disable-next-line camelcase
    const c_value = inch * conversion_getDPI()[0];
    //      console.log(c_value);
    // eslint-disable-next-line camelcase
    return c_value;
}

//=============================================================bluetooth=============================================================================================
const uuid = {
    SERVICE_HEALTH_DETECT: "0000ff27-0000-1000-8000-00805f9b34fb",
    CHARACTERISTIC_HEART_RATE_WRITE: "0000fff1-0000-1000-8000-00805f9b34fb",
    CHARACTERISTIC_HEART_RATE_MEASUREMENT: "0000fff4-0000-1000-8000-00805f9b34fb",
    DESCRIPTORS_GENERAL: "00002901-0000-1000-8000-00805f9b34fb",
    DEV_INFO_SER_UUID: "0000180a-0000-1000-8000-00805f9b34fb",
    DEV_INFO_FIRMWARE_REV_UUID: "00002a26-0000-1000-8000-00805f9b34fb",
    DEV_INFO_HARDWARE_PCB_UUID: "00002a27-0000-1000-8000-00805f9b34fb",
    DEV_INFO_SOFTWARE_REV_UUID: "00002a28-0000-1000-8000-00805f9b34fb",
};

function isWebBluetoothEnable() {
    /**
     * Web Bluetooth API only support https
     */
    if (!window.isSecureContext) {
        console.log("Web Bluetooth API is only support https protocel!");
        return false;
    }

    /**
     * Web Bluetooth API need open manual experimental web platform features
     */
    if (navigator.bluetooth) {
        return true;
    }
    console.log(
        "Web Bluetooth API is not available.\nPlease make sure the 'Experimental Web Platform features' flag is enabled."
    );
    return false;
}

function requestOptions() {
    return {
        filters: [{
            namePrefix: "HC0"
        }],
        optionalServices: [uuid.SERVICE_HEALTH_DETECT, uuid.DEV_INFO_SER_UUID, ],
        acceptAllDevices: false,
    };
}

//when gatt servie disconnected
function handleGattServiceDisconnected() {
    console.log("   handleGattServiceDisconnected");
}

// when characteristic value changed
function handleCharacteristicValueChanged(event) {
    const value = event.target.value.buffer;
    // tanslate ctrl to workthread
    engine.pushRawData(value);
}

function requestDevice() {
    return navigator.bluetooth
        .requestDevice(requestOptions())
        .then((devices) => {
            bleDevices = devices;
            bleDevices.addEventListener(
                "gattserverdisconnected",
                handleGattServiceDisconnected
            );
        });
}

async function connectDevicesAndCacheCharacteristices() {
    if (bleDevices == null) {
        return Promise.resolve();
    }
    if (
        bleDevices.gatt.connected &&
        bleCommandCharacteristic != null &&
        bleNotifyCharacteristic != null
    ) {
        console.log(
            `  bleDevices=${bleDevices}  bleDevices.gatt.connected=${bleDevices.gatt.connected}  bleCommandCharacteristic=${bleCommandCharacteristic}  bleNotifyCharacteristic=${bleNotifyCharacteristic}`
        );
        return Promise.resolve();
    }
    console.log(" connect return");
    // eslint-disable-next-line no-return-await
    return bleDevices.gatt
        .connect()
        .then((server) =>
            server.getPrimaryService(uuid.SERVICE_HEALTH_DETECT)
        )
        .then((service) => service.getCharacteristics())
        .then((characteristics) => {
            characteristics.forEach((characteristic) => {
                switch (characteristic.uuid) {
                    case uuid.CHARACTERISTIC_HEART_RATE_WRITE:
                        bleCommandCharacteristic = characteristic;
                        break;
                    case uuid.CHARACTERISTIC_HEART_RATE_MEASUREMENT:
                        bleNotifyCharacteristic = characteristic;
                        bleNotifyCharacteristic
                            .startNotifications()
                            .then((_) => {
                                bleNotifyCharacteristic.addEventListener(
                                    "characteristicvaluechanged",
                                    handleCharacteristicValueChanged
                                );
                            });
                        console.log("nofify has been start");
                        break;
                    default:
                        break;
                }
            });
        });
}

async function getDevicesVersion() {
    await bleDevices;
    if (bleDevices == null) {
        return Promise.resolve();
    }
    // eslint-disable-next-line no-return-await
    return bleDevices.gatt
        .connect()
        .then((server) =>
            server.getPrimaryService(uuid.DEV_INFO_SER_UUID)
        )
        .then((service) => service.getCharacteristics())
        .then((characteristics) => {
            characteristics.forEach(async (characteristic) => {
                switch (characteristic.uuid) {
                    case uuid.DEV_INFO_FIRMWARE_REV_UUID:
                        bleFIRMWARECharacteristic = characteristic;
                        // eslint-disable-next-line no-case-declarations
                        const valueF = await bleFIRMWARECharacteristic.readValue();
                        // eslint-disable-next-line no-case-declarations
                        let stringF = "";
                        for (let i = 0; i < valueF.byteLength; i++) {
                            stringF += String.fromCharCode(valueF.getUint8(i));
                        }
                        document.querySelector("#firm_v").textContent = stringF.slice(0, stringF.length - 1);
                        break;
                    case uuid.DEV_INFO_HARDWARE_PCB_UUID:
                        bleHARDWARECharacteristic = characteristic;
                        // eslint-disable-next-line no-case-declarations
                        const valueH = await bleHARDWARECharacteristic.readValue();
                        // eslint-disable-next-line no-case-declarations
                        let stringH = "";
                        for (let i = 0; i < valueH.byteLength; i++) {
                            stringH += String.fromCharCode(valueH.getUint8(i));
                        }
                        document.querySelector("#hare_v").textContent = stringH.slice(0, stringH.length - 1);
                        break;
                    case uuid.DEV_INFO_SOFTWARE_REV_UUID:
                        bleSOFTWARECharacteristic = characteristic;
                        // eslint-disable-next-line no-case-declarations
                        const valueS = await bleSOFTWARECharacteristic.readValue();
                        // eslint-disable-next-line no-case-declarations
                        let stringS = "";
                        for (let i = 0; i < valueS.byteLength; i++) {
                            stringS += String.fromCharCode(valueS.getUint8(i));
                        }
                        document.querySelector("#soft_v").textContent = stringS.slice(0, stringS.length - 1);
                        break;
                    default:
                        break;
                }
            });
        });
}