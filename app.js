var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var NaverStrategy = require('passport-naver').Strategy;
var app = express();
var server = require('http').Server(app);
var Rndld = null;
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());
app.use(session({
    secret: 'FactoryFunFactoryFunFactoryFunFactoryFun',
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.engine('html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

//페이지 연결
app.get('/', function(req, res) {
    res.redirect('/main');
});
//로그아웃
app.get('/logout', function(req, res) {
    //마지막 로그아웃 시간 기록
    var dateUTC = new Date();
    var dateKTC = dateUTC.setHours(dateUTC.getHours() + 9);
    User.update({ _id: req.user._id }, { $set: { last_logout: dateKTC } }, function(err) {
        if (err) throw err;
    });
    req.logout();
    req.session.save(function() {
        res.redirect('/login');
    });
});
//DB 커넥트
mongoose.connect("mongodb://yong.netb.co.kr:443/FactoryFun");
var db = mongoose.connection;
db.once("open", function() {
    console.log("DB connected!");
});
db.on("error", function(err) {
    console.log("DB ERROR :", err);
});
//서버 시작
server.listen(3000);


//유저전역 스키마 생성
var userData = mongoose.Schema({
    user_id: { type: String, unique: true },
    user_pw: { type: String },
    user_nick: { type: String, unique: true },
    win: { type: Number },
    lose: { type: Number },
    email: { type: String },
    sns: { type: String },
    created_at: { type: Date, default: Date.now },
    last_logout: { type: Date }
});
//패스워드 비교 userData를 User에 담기 전에 이걸 써넣어야 로그인 사용가능
userData.methods.validPassword = function(password) {
    return this.user_pw == password;
};
var User = mongoose.model('userData', userData);
app.get('/join', function(req, res) {
    res.render('join');
});
//회원가입
app.post('/joinForm', function(req, res) {
    var user = new User({
        user_id: req.body.userId,
        user_pw: req.body.userPw,
        user_nick: req.body.userNick,
        win: 0,
        lose: 0,
        email: "",
        sns: ""
    });
    user.save(function(err) {
        if (err) {
            res.send('<script>alert("사용 중인 닉네임 또는 아이디 입니다.");location.href="/join";</script>');
            return console.error(err);
        } else res.send('<script>alert("가입 완료");location.href="/";</script>');
    });
});
//로그인
passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(user, done) {
    done(null, user);
});
passport.use(new LocalStrategy({ passReqToCallback: true }, function(req, username, password, done) {
    User.findOne({ user_id: username }, function(err, user) {
        if (err) {
            return done(err);
        }
        if (!user) {
            return done(null, false, req.flash('message', '아이디가 없습니다.'));
        }
        if (!user.validPassword(password)) {
            return done(null, false, req.flash('message', '비밀번호가 틀렸습니다.'));
        }
        return done(null, user);
    });
}));
app.get('/join_nick', function(req, res) {
    res.render('join_nick', { user: req.user });
});

app.get('/index', function(req, res) {
    res.render('index', { user: req.user });
});
app.post('/joinNickForm', function(req, res) {
    User.update({ _id: req.user._id }, { $set: { user_nick: req.body.userNick } }, function(err) {
        res.render('main', { user: req.user });
    });
});
app.post('/loginForm', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));
app.get('/login', function(req, res) {
    if (req.user) {
        res.render('main');
    } else {
        res.render('login');
    }
});
//게임 전역 스키마 생성
var roomData = mongoose.Schema({
    name: { type: String },
    admin: { type: String },
    maxMember: { type: Number },
    delete: { type: String },
    start: { type: String },
    select_board: { type: String },
    player: [],
    board: [],
    tile_engine: [],
    member: { type: [String] },
    round: { type: Number },
    tile_black: { type: Number },
    tile_way_1: { type: Number },
    tile_way_2: { type: Number },
    tile_way_3: { type: Number },
    tile_way_4: { type: Number },
    tile_way_5: { type: Number },
    tile_way_6: { type: Number },
    created_at: { type: Date, default: Date.now }
});
var Room = mongoose.model('roomData', roomData);

app.get('/main', function(req, res) {
    if (req.user) {
        User.findOne({ _id: req.user._id }, { _id: 0, last_logout: 0, user_id: 0, user_pw: 0, __v: 0 }, function(err, userValue) {
            Room.find({ delete: "no" }, function(err, roomValue) {
                res.render('main', { user: userValue, room: roomValue });
            });
        });
    } else {
        res.redirect('/login');
    }
});

//방만들기
app.post('/roomCreat', function(req, res) {
    var now = new Date();
    now = dateToYYYYMMDDMMSS(now);
    if (req.user) {
        var room = new Room({
            name: now,
            admin: req.user.user_nick,
            maxMember: 5,
            member: [req.user.user_nick],
            board: ["board_a_classic","board_b_classic","board_c_classic","board_d_classic","board_e_classic","board_a_expert","board_b_expert","board_c_expert","board_d_expert","board_e_expert"],
            delete: "no",
            tile_black : 13,
            tile_way_1: 72,
            tile_way_2: 72,
            tile_way_3: 9,
            tile_way_4: 8,
            tile_way_5: 9,
            tile_way_6: 8,
            start: "대기",
            select_board: "아직",
            round: 1
        });
        room.save(function(err) {
            if (err) {
                res.send('<script>alert("에러남");location.href="/join";</script>');
                return console.error(err);
            } else res.send('<script>location.href="/";</script>');
        });
    } else {
        res.render('login');
    }
});
app.get('/room', function(req, res) {
    if (req.user) {
        if (req.query.roomId != null) {
            Room.findOne({ _id: req.query.roomId }, function(err, roomValue) {
                //판떼기 안골랐는지 체크
                if (roomValue.select_board !== "모두 고름") {
                    var count = 0;
                    for (var i = 0; i < roomValue.player.length; i++) {
                        if (roomValue.player[i].board !== "아직") {
                            count = count + 1;
                            if (count === roomValue.member.length) {
                                Room.update({ _id: req.query.roomId, player: { $elemMatch: { nick: req.user.user_nick } } }, { $set: { select_board: "모두 고름" } }, function(err) {});
                            }
                        }
                    }
                }
                res.render('room', { room: roomValue, user: req.user });
            });
        } else {
            res.send('<script>alert("잘못된 요청");location.href="/main";</script>');
        }
    } else {
        res.render('login');
    }
});
app.get('/roomLocal', function(req, res) {
    if (req.user) {
        if (req.query.roomId != null) {
            Room.findOne({ _id: req.query.roomId }, function(err, roomValue) {
                //판떼기 안골랐는지 체크
                if (roomValue.select_board !== "모두 고름") {
                    var count = 0;
                    for (var i = 0; i < roomValue.player.length; i++) {
                        if (roomValue.player[i].board !== "아직") {
                            count = count + 1;
                            if (count === roomValue.member.length) {
                                Room.update({ _id: req.query.roomId, player: { $elemMatch: { nick: req.user.user_nick } } }, { $set: { select_board: "모두 고름" } }, function(err) {});
                            }
                        }
                    }
                }
                res.render('roomLocal', { room: roomValue, user: req.user });
            });
        } else {
            res.send('<script>alert("잘못된 요청");location.href="/main";</script>');
        }
    } else {
        res.render('login');
    }
});
//참가하기
app.post('/joinRoom', function(req, res) {
    if (req.user) {
        Room.update({ _id: req.query.roomId }, { $push: { member: req.user.user_nick } }, function(err) {
            res.redirect('/room?roomId=' + req.query.roomId);
        });
    } else {
        res.render('login');
    }
});
//나가기
app.post('/leaveRoom', function(req, res) {
    if (req.user) {
        Room.update({ _id: req.query.roomId }, { $pull: { member: req.user.user_nick } }, function(err) {
            res.redirect('/room?roomId=' + req.query.roomId);
        });
    } else {
        res.render('login');
    }
});
//방폭
app.post('/deleteRoom', function(req, res) {
    if (req.user) {
        var roomId = req.query.roomId;
        Room.update({ _id: roomId }, { $set: { delete: "yes" } }, function(err) {
            res.redirect('/main');
        });
    } else {
        res.render('login');
    }
});
//시작 
app.post('/startRoom', function(req, res) {
    if (req.user) {
        Room.findOneAndUpdate({ _id: req.query.roomId }, { $set: { start: "진행 중" } }, function(err, roomValue) {
            //플레이어 초기값 입력 저장
            var build = [];
            for (var j = 0, row, col; j <= 90; j++) {
                row = parseInt(j / 10) + 1;
                col = j % 10;
                if (col === 0) {
                    row = row - 1;
                    col = 10;
                }
                build[j] = { index: j, tile: "", rotate: 0, row: row, col: col };
            }    
            for (var i = 0; i < roomValue.member.length; i++) {
                Room.update({ _id: req.query.roomId }, { $push: { player: { 
                    nick: roomValue.member[i],
                    board: "아직",
                    select_engine: "아직",
                    build: build,
                    rest_engine: 10,
                    tile_option: 1,
                    tile_white: 3,
                    tile_energy_blue: 1,
                    tile_energy_green: 1,
                    tile_energy_orange: 1,
                    tile_energy_red: 1,
                    score: 2 
                } } }, function(err) {});
            }
            res.redirect('/room?roomId=' + req.query.roomId);
        });
    } else {
        res.render('login');
    }
});
//보드판 고르기
app.post('/selectBoard', function(req, res) {
    if (req.user) {
        var randBoard, randNum;
        Room.findOne({ _id: req.query.roomId }, function(err, roomValue) {
            if (req.query.board === "random_1") {
                randNum = Math.floor(Math.random() * 5);
                randBoard = roomValue.board[randNum];
                Room.update({ _id: req.query.roomId, player: { $elemMatch: { nick: req.user.user_nick } } }, { $set: { 'player.$.board': randBoard }, $inc: { 'player.$.score': 2 } }, function(err) {});
            } else if (req.query.board === "random_2") {
                randNum = Math.floor(Math.random() * 10);
                randBoard = roomValue.board[randNum];
                Room.update({ _id: req.query.roomId, player: { $elemMatch: { nick: req.user.user_nick } } }, { $set: { 'player.$.board': randBoard }, $inc: { 'player.$.score': 3 } }, function(err) {});
            } else if (req.query.board === "random_3") {
                randNum = Math.floor(Math.random() * 5) + 5;
                randBoard = roomValue.board[randNum];
                Room.update({ _id: req.query.roomId, player: { $elemMatch: { nick: req.user.user_nick } } }, { $set: { 'player.$.board': randBoard }, $inc: { 'player.$.score': 4 } }, function(err) {});
            } else {
                Room.update({ _id: req.query.roomId, player: { $elemMatch: { nick: req.user.user_nick } } }, { $set: { 'player.$.board': req.query.board } }, function(err) {});
            }
            var num = new Array();
            var randEngine = new Array();
            for (var i = 0; i < 10; i++) {
                num[i] = shuffleRandom(54)[i];
                randEngine[i] = roomValue.tile_engine[num[i]];
            }
            Room.update({ _id: req.query.roomId, player: { $elemMatch: { nick: req.user.user_nick } } }, { $set: { 'player.$.tile_engine': randEngine } }, function(err) {
                res.redirect('/room?roomId=' + req.query.roomId); 
            });
        });
    } else {
        res.render('login');
    }
});
//엔진 고르기
app.post('/selectEngine', function(req, res) {
    if (req.user) {
        var incKey, incQuery;
        if (req.query.id === "all") {
            var allEnergy = new Array("blue", "green", "orange", "red");
            incQuery = { 'player.$.rest_engine': -1 };
            incKey = "player.$.tile_energy_" + allEnergy[Math.floor(Math.random() * allEnergy.length)];
            incQuery[incKey] = 1;
        } else if (req.query.id === "") {
            incQuery = { 'player.$.rest_engine': -1 };
        } else {
            incQuery = { 'player.$.rest_engine': -1 };
            incKey = "player.$.tile_energy_" + req.query.id;
            incQuery[incKey] = 1;
        }
        Room.update({ _id: req.query.roomId, player: { $elemMatch: { nick: req.user.user_nick } } }, { $set: { 'player.$.select_engine': req.query.engine }, $inc: incQuery }, function(err) {
            res.redirect('/room?roomId=' + req.query.roomId);
        });
    } else {
        res.render('login');
    }
});
app.post('/giveUp', function(req, res) {
    if (req.user) {
        Room.update({ _id: req.query.roomId, player: { $elemMatch: { nick: req.user.user_nick } } }, { $inc: { 'player.$.score': -5, round : 1 }, $set: { 'player.$.select_engine': "아직" } }, function(err) {
            Room.update({ _id: req.query.roomId, player: { $elemMatch: { nick: req.user.user_nick }}, 'player.score': { $lt : 0 } }, { $set: { 'player.$.score': 1 } }, function(err) {
                res.redirect('/room?roomId=' + req.query.roomId);  
            });    
        });
    } else {
        res.render('login');
    }
});
app.post('/ajaxSaveTile', function(req, res) {
    if (req.user) {
        Room.findOne({ _id: req.query.roomId }, function(err, roomValue) {
           
            Room.update({ _id: req.query.roomId }, { $set: setQuery, $inc: incQuery }, function(err) {});
            var incQuery = { round: 1 };
            var incKeyScore = "player." + memberValue + ".score";
            incQuery[incKeyScore] = parseInt(engineAttr.score - countScore.length + 1);
            console.log(engineAttr.score,"engineAttr.score");
            console.log(countScore.length,"countScore.length");
            console.log(incQuery,"incQuery");
            Room.update({ _id: req.query.roomId, player: { $elemMatch: { nick: req.user.user_nick } } }, { $set: { 'player.$.select_engine': "아직" }, $inc: incQuery }, function(err) {
                res.send({ result: "성공", score: incQuery[incKeyScore] });
            });
        });
    } else {
        res.render('login');
    }
});

function dateToYYYYMMDDMMSS(date) {
    function pad(num) {
        var num = num + '';
        return num.length < 2 ? '0' + num : num;
    }
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
}
function shuffleRandom(n) {
    var ar = new Array();
    var temp;
    var rnum;
    for (var i = 0; i < n; i++) {
        ar.push(i);
    }
    for (var i = 0; i < ar.length; i++) {
        rnum = Math.floor(Math.random() * n);
        temp = ar[i];
        ar[i] = ar[rnum];
        ar[rnum] = temp;
    }
    return ar;
}
