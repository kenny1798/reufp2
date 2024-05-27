const express = require('express');
const app = express();
const db = require('./models');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const port = parseInt(process.env.PORT, 10);
const {admin, bookings, holidays, temp_bookings} = require('./models');
const {Server} = require("socket.io");
const { Client, LocalAuth } = require('whatsapp-web.js');
const http = require('http');
var cron = require('node-cron');
const crypto = require('crypto');
const { sign } = require('jsonwebtoken');
const server = http.createServer(app);
const {validateToken} = require('./middleware/AuthMiddleware');
const Op = require('sequelize').Op;
var cron = require('node-cron');
const { stringify } = require('querystring');

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({
    extended: true
}));

const YOUR_SECRET_KEY = `${process.env.BILLPLZ_X_KEY}`;
const YOUR_API_KEY = `${process.env.BILLPLZ_SECRET_KEY}`;
const YOUR_COLLECTION_ID = process.env.BILLPLZ_COLLECTION_ID;
const stringKey = btoa(`${process.env.BILLPLZ_SECRET_KEY}:`);

const serverOrigins = [process.env.REACT_SERVER, process.env.ADMIN_SERVER, process.env.BILLPLZ_SERVER];
const io = new Server(server, {
  cors:{
      origin: serverOrigins, 
    credentials: true,
      methods: ["GET", "POST", "PUT"],
  }
});

cron.schedule('*/10 * * * *', async () => {
  const getOldBooking = await temp_bookings.findAll({where: {createdAt: {[Op.lt]: new Date(Date.now() - (1000 * 60 * 10)  )}}});
  res.json(getOldBooking)
  for(var i = 0; i<getOldBooking.length; i++){
    const singleOld = await getOldBooking[i];
    const findBooking = await bookings.findOne({where: {name: await singleOld.name, billId: await singleOld.billId}});
    if(!findBooking){
      await temp_bookings.destroy({where: {id: await singleOld.id}}).then(() => {
        console.log('PreBook Deleted')
      })
    }
  }
});

//BOOKING

app.get('/test', async (req,res) => {
  
})

app.post("/booking-status", async (req,res) => {
  const {billId} = req.body;
  const booking = await bookings.findOne({where:{billId: billId}});
  if(!booking){
    res.json({status:"Error"});
  }else{
    res.json({status:"Booked"})
  }
})

app.post('/booking-admin', validateToken, async (req,res) => {

  const {name, phoneNumber, email, selectedDate, selectedSession, pax} = req.body;
  const parsedPax = parseInt(pax, 10);

  try{
    if(!name || !email || !phoneNumber || !selectedDate || !selectedSession || !pax){
      res.json({error: 'Please fill up all details'})
    }else{
      await bookings.create({
        name: name,
        email: email,
        phoneNumber: phoneNumber,
        bookingDate: selectedDate,
        bookingTime: selectedSession,
        bookingPax: parsedPax,
        billId: 'Admin'
      }).then(() => {
        res.json({succ: 'Reservation submitted successfully'})
      })

    }
  }catch(err){
      res.json({error: err.message})
    }

})


app.post('/booking', async (req,res) => {
const {name, phoneNumber, email, selectedDate, selectedSession, pax} = req.body;
const parsedPax = parseInt(pax, 10);
const slicedDate = selectedDate.slice(0,15);
const totalAmount = parsedPax * 100

try{
  if(!name || !email || !phoneNumber || !selectedDate || !selectedSession || !pax){
    res.json({error: 'Please fill up all details'})
  }else{
  const test = async () => {
    let response = await fetch(`${process.env.BILLPLZ_SERVER}/api/v3/bills`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${stringKey}`
      },
      body: `collection_id=eimpoxep&description=Reserve on ${slicedDate} (${selectedSession}) for ${parsedPax} pax&email=${email}&mobile=${phoneNumber}&name=${name}&amount=${totalAmount}&callback_url=${process.env.THIS_SERVER}/billplz-callback/&redirect_url=${process.env.REACT_SERVER}/reserve-finish/`
  });

  const json = response.json()
  
  return json;  
  }

  try{
    const response = await test();
    console.log(response)
    if(response.error){
      const errMsg = response.error.message.join(", ");
      res.json({error: errMsg});
    }else{
      await temp_bookings.create({
        name: name,
        email: email,
        phoneNumber: phoneNumber,
        bookingDate: selectedDate,
        bookingTime: selectedSession,
        bookingPax: parsedPax,
        billId: response.id
      }).then(() => {
        res.json({url: response.url})
      })
    }
    }catch(err){
      res.json({error: err.message})
    }
  }
}catch(err){
  console.log(err)
}
})

app.post('/billplz-callback', async (req, res) => {
  const {
    id,
    collection_id,
    paid,
    state,
    amount,
    paid_amount,
    due_at,
    email,
    mobile,
    name,
    url,
    paid_at,
    x_signature,
  } = req.body;

  // Verify the signature
  const signatureData = `amount${amount}|collection_id${collection_id}|due_at${due_at}|email${email}|id${id}|mobile${mobile}|name${name}|paid_amount${paid_amount}|paid_at${paid_at}|paid${paid}|state${state}|url${url}`;
  console.log('x-signature:',x_signature);
  const calculatedSignature = crypto.createHmac('sha256', YOUR_SECRET_KEY).update(signatureData).digest('hex');
  console.log('calculated x-signature:', calculatedSignature);

  if (calculatedSignature !== x_signature) {
    console.error('Invalid signature. Callback ignored.');
    return res.status(400).send('Invalid signature');
  }

  if (collection_id !== YOUR_COLLECTION_ID) {
    console.error('Invalid collection ID. Callback ignored.');
    return res.status(400).send('Invalid collection ID');
  }

  // Log the received data
  console.log('Billplz Callback Received:');
  console.log('ID:', id);
  console.log('Collection ID:', collection_id);
  console.log('Paid:', paid);
  console.log('State:', state);
  console.log('Amount:', amount);
  console.log('Paid Amount:', paid_amount);
  console.log('Due At:', due_at);
  console.log('Email:', email);
  console.log('Mobile:', mobile);
  console.log('Name:', name);
  console.log('URL:', url);
  console.log('Paid At:', paid_at);

  // Your business logic goes here
  const tempBooking = await temp_bookings.findOne({where: {billId: id}});
  await bookings.create({
    name: name,
    email: email,
    phoneNumber: mobile,
    bookingDate: await tempBooking.bookingDate,
    bookingTime: await tempBooking.bookingTime,
    bookingPax: await tempBooking.bookingPax,
  }).then(() => {
    res.json({status: 'Booked'})
  })

  // Send a response to Billplz
  res.status(200).send('Callback received successfully');
});

//ADMIN

app.post("/signin", async (req,res) => {
  try{
    const {username, password} = req.body;
    const ausername = process.env.ADMIN_ID;
    const apassword = process.env.ADMIN_PASS;
    if(!username || !password){
      res.json({error:"Field cannot blank"});
    }else if(username !== ausername){
      res.json({error:"username/password incorrect"})
    }else if(password !== apassword){
      res.json({error:"username/password incorrect"})
    }else{
      const accessToken = sign({username:username}, process.env.JWT_SECRET);
      res.json({token:accessToken})
    }
  }catch(error){
    console.log(error);
  }
})

app.get("/get-bookings", validateToken, async (req,res) => {
  try{
    const allbookings = await bookings.findAll();
    res.json(allbookings);
  }catch(error){
    console.log(error)
  }
})

app.post("/get-a-booking", validateToken, async (req,res) => {
  try{
    const {selectedDate} = req.body;
    const newDate = new Date(selectedDate);
    const allbookings = await bookings.findAll({where: {bookingDate: newDate}});
    res.json(allbookings);
  }catch(error){
    console.log(error)
  }
})

app.get("/get-holidays", validateToken, async (req,res) => {
  try{
    const holiday = await holidays.findAll();
    res.json(holiday)
  }catch(err){
    console.log(err)
  }
})

app.post("/post-holidays", validateToken, async (req,res) => {
  try{
    const {selectedDate} = req.body;
    await holidays.create({
      holidayDate: new Date(selectedDate)
    }).then(() => {
      res.json({succ: "Day off submitted successfully"});
    })
    
  }catch(err){
    res.json({err: "Something wrong, please try again"});
  }
})

app.post("/get-a-holiday", validateToken, async (req,res) => {
  try{
    const {selectedDate} = req.body;
    const getDate = await holidays.findOne({where: {holidayDate: new Date(selectedDate)}});
    if(getDate){
      res.json({succ: "Holiday"})
    }
    
  }catch(err){
    console.log(err)
  }
})

app.get("/get-book-date", validateToken, async (req,res) => {
  try{
    const allBook = await bookings.findAll();
    let date = []
    for(var i = 0; i< allBook.length; i++){
      const singleBook = await allBook[i];
      const singleDate = String(await singleBook.bookingDate)
      console.log(date.includes(singleDate))
      if(date.includes(singleDate) == false){
        date.push(singleDate)
      }
    }
    res.json(date)
  }catch(err){
    console.log(err)
  }
})

app.post("/get-session", validateToken, async (req,res) => {
try{
  const {selectedDate} = req.body;
  const newDate = new Date (selectedDate);
  let firstSession = 0;
  let secondSession = 0;
  let thirdSession = 0;
  await bookings.findAll({where: {bookingDate: newDate}}).then( async (response) => {
    for (var i = 0; i< await response.length; i++){
      const singleBooking = await response[i];
      const singleBookingSession = await singleBooking.bookingTime;
      const singleBookingPax = await singleBooking.bookingPax;

      if(singleBookingSession === process.env.FIRST_SESSION){
        firstSession = firstSession + singleBookingPax
      }

      if(singleBookingSession === process.env.SECOND_SESSION){
        secondSession = secondSession + singleBookingPax
      }

      if(singleBookingSession === process.env.THIRD_SESSION){
        thirdSession = thirdSession + singleBookingPax
      }

    }
    if (firstSession >= 10){
      firstSession = 'full'
    }
    if (secondSession >= 10){
      secondSession = 'full'
    }
    if (firstSession >= 10){
      firstSession = 'full'
    }

    remainingFirstSession = 10 - firstSession;
    remainingSecondSession = 10 - secondSession;
    remainingThirdSession = 10 - thirdSession;

    res.json({firstSession:remainingFirstSession, secondSession: remainingSecondSession, thirdSession: remainingThirdSession});

  })
}catch(err){
  console.log(err)
}
})


db.sequelize.sync().then( async () => {
  const accessToken = sign(process.env.ADMIN_ID, process.env.JWT_SECRET);
  const session = await admin.findOne({where: {token:accessToken}});
  const latest = await admin.findAll({limit: 1, where: {text: {[Op.ne]: null}} ,order: [ [ 'createdAt', 'DESC' ]]});
  const text = latest[0].dataValues.text

  if(!session && !latest){
    admin.create({
      token: accessToken,
    })
  }else if(!session && latest){
    admin.create({
      token: accessToken,
      text: text
    })
    console.log('here')
  }
    server.listen(port, () => {
        console.log(`Server running on port: ${port}`);
    });
});