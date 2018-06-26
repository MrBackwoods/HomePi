// Required modules
var app = require("express")();
var basicAuth = require("express-basic-auth");
var cmd = require("node-cmd");
var sensor = require("node-dht-sensor");
var pi = require("node-raspi");
var nodemailer = require("nodemailer");

// Webcam loop
cmd.run("sudo killall fswebcam");
cmd.run("sudo fswebcam -r 640x360 /home/pi/Webservice2/img.jpg --skip '65' --loop '10' --background -i 0");

// Users
app.use(basicAuth({
    users: {
        "Test": "Pass"
    },
    unauthorizedResponse: getUnauthorizedResponse
}))

// Unauthorized response
function getUnauthorizedResponse(req) {
    return req.auth ?
        ("Credentials " + req.auth.user + ":" + req.auth.password + " rejected.") :
        "No credentials provided."
}

// Starts listening on port 8001
app.listen(8001, function() {
    console.log("Listening on port 8001.");
});

// GET: latest webcam image
app.get("/webcam", function(req, res) {
    res.sendFile("img.jpg", {
        "root": __dirname
    });
});

// GET: turns off the Raspberry Pi
app.get("/raspberryoff", function(req, res) {
    cmd.run("sudo shutdown -h now");
    res.send("Raspberry Pi has been turned off.")
});

// GET: Raspberry Pi's CPU temperature
app.get("/raspberrytemp", function(req, res) {
    var temp = pi.getThrm() + " °C";
    res.send(temp);
});

// GET: temperature and humidity from sensor (DHT22)
app.get("/hometemp", function(req, res) {
    sensor.read(22, 19, function(err, temperature, humidity) {
        if (!err) {
            res.send(JSON.stringify({
                Temperature: temperature.toFixed(1) + " °C",
                Humidity: humidity.toFixed(1) + " %"
            }));
        } else {
            res.send("No reading.");
        }
    })
});

// Loop to send mail when temperature is over 35°C - also shuts the Raspberry Pi down
setInterval(function() {
    sensor.read(22, 19, function(err, temperature, humidity) {
        if (!err) {
            if (temperature.toFixed(1) >= 35) {
                transporter.sendMail(mailOptions, function(err) {
                    if (err) {
                        console.log(err)
                    }
                cmd.run("sudo shutdown -h now");
                })
            }
        }
    })
}, 60000);

// Email account information
var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "user@gmail.com",
        pass: "password"
    }
});

// Mail information
const mailOptions = {
    from: "user@gmail.com",
    to: "user@gmail.com",
    subject: "Temperature warning!",
    html: "<p>Warning! Home temperature is over 35°C! </p>",
    attachments: [{
        filename: "webcam.jpg",
        path: "img.jpg"
    }]
};
