var admin = require("firebase-admin");
const fs = require("fs");
var serviceAccount = require("./findmycar-271019-firebase-adminsdk-q91xw-8e09c6603a");
var https = require("https");
admin.initializeApp({
 credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const express = require('express'),
http = require('http'),
app = express(),
server = http.createServer(app),
io = require('socket.io').listen(server);
var carInterval = {}
var carIntervalExpired = {}
var liveFriendInterval = {}

app.get('/', (req, res) => {
 res.send('Chat Server is running on port 3000')
});
app.get('/get', (req, res) => {
 console.log('finalmente per la madonna')
 res.send('Chat Server is running on port 3000')
});
app.get('/addFriend', (req, res) => {

 var user = req.query.username.replace("@gmail.com","")
 var sender = req.query.sender.replace("@gmail.com","")
 var notfriend = true
 console.log("user "+user+"\nsender "+sender);
 db.collection('user').doc(user).get().then(documentSnapshot => {

   if (documentSnapshot.exists) {
       db.collection('user').doc(user).collection("friend").get().then(friendSnapshot => {
         //check if already friends
         console.log("FRIEND DATA");
         try{
         friendSnapshot.forEach(doc => {
           var friend = doc.data()
              if(friend.friend == sender) {
                notfriend = false
                break
                console.log("already friend");
              }
         });
       }
       catch(e){}
         if(notfriend){
           db.collection('user').doc(user).collection("friendrequest").add({
          		origin: sender
        	  }).then(ref => {
         		 console.log('Added friendrequest with ID: ', ref.id);
        	});
         }
     })
   }
 });
});

app.get('/confirmFriend', (req, res) => {

 var receiver = req.query.receiver.replace("@gmail.com","")
 var sender = req.query.sender.replace("@gmail.com","")
 var notfriend = true
 console.log("receiver "+receiver+"\nsender "+sender);
 db.collection('user').doc(receiver).collection("friend").get().then(documentSnapshot => {
   if (documentSnapshot.exists) {
     documentSnapshot.forEach(doc => {
       var friend = doc.data()
          if(friend.friend == sender){
           console.log("already friend");
           notfriend = false
           break
        }
     });
     if(notfriend){
       db.collection('user').doc(receiver).collection("friend").add({
          friend:sender
       }).then(ref => {
         console.log('Added friend with ID: ', ref.id);
       });
      db.collection('user').doc(sender).get().then(documentSnapshot => {
       if (documentSnapshot.exists) {
         db.collection('user').doc(sender).collection("friend").add({
            friend:receiver
         }).then(ref => {
           console.log('Added friend with ID: ', ref.id);
         });
         db.collection('user').doc(sender).collection("addedfriend").add({
            friend:receiver
         }).then(ref => {
           console.log('Added friend with ID: ', ref.id);
         });
       }
      });
    }
   }
 });

});

app.get('/removeFriend', (req, res) => {
 var receiver = req.query.receiver.replace("@gmail.com","")
 var sender = req.query.sender.replace("@gmail.com","")
 console.log("receiver "+receiver+"\nsender "+sender);
 db.collection('user').doc(receiver).get().then(documentSnapshot => {
   if (documentSnapshot.exists) {
     db.collection('user').doc(receiver).collection("friend").get().then(friendSnapshot => {
       //check if already friends
       console.log("deliting FRIEND");
       friendSnapshot.forEach(doc => {
         var friend = doc.data()
           if(friend.friend == sender) {
               db.collection('user').doc(receiver).collection("friend").doc(doc.id).delete();
               //res.send(1)//already friend
           }
       });
     });
   }
 });

 db.collection('user').doc(sender).get().then(documentSnapshot => {
   if (documentSnapshot.exists) {
     db.collection('user').doc(sender).collection("friend").get().then(friendSnapshot => {
       //check if already friends
       friendSnapshot.forEach(doc => {
         var friend = doc.data()
           if(friend.friend == receiver) {
               db.collection('user').doc(sender).collection("friend").doc(doc.id).delete();
           }
       });
     });
   }
 });
});

app.get('/getPoiFromFriend', async (req, res) => {
 var myList = {};
 var friend = req.query.friend.replace("@gmail.com","")
 console.log("friend "+friend);
 db.collection('user').doc(friend).collection("marker")
 .get()
 .then(snapshot => {
     snapshot.forEach(doc => {
       var tmp = doc.data()
       var myjson = {}
       if(tmp["type"] == "Pubblico"){
         for(var i in tmp){
           myjson[i] = tmp[i]
         }
         var pos ="("+myjson["lat"]+","+myjson["lon"]+")"
         myList[pos] = myjson
     }
     });
     res.send(myList)
 })

});

app.get('/reminderAuto', async (req, res) => {
  var timer = req.query.timer
  var owner = req.query.owner
  var name = req.query.name
  var address = req.query.addr
  var key = owner+name
  var mycar = {}
  mycar["timer"] = timer
  mycar["owner"] = owner
  mycar["name"] = name
  mycar["addr"] = address
  console.log(mycar);

  var remind = setInterval(function() {
    db.collection('user').doc(owner).collection("timed").add({
      key: mycar
    }).then(ref => {
      console.log('Added timer scaduto ', mycar);
    // res.send(2)//sent friend request
   });
   clearInterval(remind)
 },timer*60*1000-300000)

 carInterval[key] = remind
 var exp = setInterval(function() {
   db.collection('user').doc(owner).collection("timedExpired").add({
     key: mycar
   }).then(ref => {
     console.log('Added timer finito ', mycar);
   // res.send(2)//sent friend request
  });
  clearInterval(exp)
},timer*60*1000)

carIntervalExpired[key] = exp
 });

//call to remove interval of auto if canceled
 app.get('/resetTimerAuto', async (req, res) => {
   var timer = req.query.timer
   var owner = req.query.owner
   var name = req.query.name
   var address = req.query.addr
   var key = owner+name
   var mycar = {}
   mycar["timer"] = timer
   mycar["owner"] = owner
   mycar["name"] = name
   mycar["addr"] = address
   console.log(mycar);

   //Copy this shit when timer is expired
   clearInterval(carInterval[key])
   clearInterval(carIntervalExpired[key])
   var remind = setInterval(function() {
     db.collection('user').doc(owner).collection("timed").add({
       key: mycar
     }).then(ref => {
       console.log('Added timer scaduto reset', mycar);
     // res.send(2)//sent friend request
    });
    clearInterval(remind)
  },timer*60*1000-300000)

  carInterval[key] = remind
  var exp = setInterval(function() {
    db.collection('user').doc(owner).collection("timedExpired").add({
      key: mycar
    }).then(ref => {
      console.log('Added timer finito reset ', mycar);
    // res.send(2)//sent friend request
   });
   clearInterval(exp)
 },timer*60*1000)

 carIntervalExpired[key] = exp
  });

app.get('/startLive', async (req, res) => {
  var timer = req.query.timer
  var owner = req.query.owner
  var name = req.query.name
  var address = req.query.addr
  var key = owner+name
  var mylive = {}
  mylive["timer"] = timer
  mylive["owner"] = owner
  mylive["name"] = name
  mylive["addr"] = address
  console.log(mylive);
  console.log(owner);
    db.collection('user').doc(owner).collection("friend")
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        var tmp = doc.data()
        var friend = tmp["friend"]
        var supKey = key+friend
        console.log(supKey);
        console.log("IN");
        db.collection('user').doc(friend).collection("live").add({
          key: mylive
        }).then(ref => {
          console.log('EVENTO LIVE AGGIUNYTO', mylive);
          // res.send(2)//sent friend request
       });
    });
    })
    var exp = setInterval(function() {


      db.collection('user').doc(owner).collection("friend")
      .get()
      .then(snapshot => {
        snapshot.forEach(doc => {
          var tmp = doc.data()
          var friend = tmp["friend"]
          var supKey = key+friend
          console.log(supKey);
          console.log("IN");
          db.collection('user').doc(owner).collection("timedLiveExpired").add({
            key: mylive
          }).then(ref => {
            console.log('Added timer finito live ', mycar);
          // res.send(2)//sent friend request
         });
       });
       clearInterval(exp)
     })
   },timer*60*1000)
    //add interval to delete the event
});



// https
//   .createServer(
//     {
//       key: fs.readFileSync("server.key"),
//       cert: fs.readFileSync("server.cert")
//     },
//     app
//   )
//   .listen(3000, () => console.log("Gator app listening on port 3000!"));
server.listen(3000,()=>{
 console.log('Node app is running on port 3000')
});
