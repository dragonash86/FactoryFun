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
        room.tile_engine[0] = { name: "tile_engine_0", score: 8, bonus: "", top_1: "", top_2: "", bottom_1: "2_blue_input", bottom_2: "", left: "2_red_input", right: "black" };
        room.tile_engine[1] = { name: "tile_engine_1", score: 9, bonus: "", top_1: "3_orange_input", top_2: "", bottom_1: "", bottom_2: "", left: "2_green_input", right: "black" };
        room.tile_engine[2] = { name: "tile_engine_2", score: 5, bonus: "", top_1: "", top_2: "", bottom_1: "3_blue_input", bottom_2: "", left: "2_red_input", right: "2_blue_output" };
        room.tile_engine[3] = { name: "tile_engine_3", score: 7, bonus: "", top_1: "", top_2: "", bottom_1: "", bottom_2: "1_green_output", left: "1_red_input", right: "" };
        room.tile_engine[4] = { name: "tile_engine_4", score: 12, bonus: "", top_1: "", top_2: "", bottom_1: "1_orange_input", bottom_2: "", left: "2_blue_input", right: "" };
        room.tile_engine[5] = { name: "tile_engine_5", score: 9, bonus: "", top_1: "1_green_input", top_2: "", bottom_1: "1_red_input", bottom_2: "", left: "1_orange_input", right: "3_blue_output" };
        room.tile_engine[6] = { name: "tile_engine_6", score: 8, bonus: "", top_1: "3_blue_input", top_2: "", bottom_1: "1_red_input", bottom_2: "", left: "1_green_input", right: "3_orange_output" };
        room.tile_engine[7] = { name: "tile_engine_7", score: 8, bonus: "", top_1: "3_red_input", top_2: "", bottom_1: "", bottom_2: "", left: "2_orange_input", right: "1_blue_output" };
        room.tile_engine[8] = { name: "tile_engine_8", score: 7, bonus: "", top_1: "1_red_input", top_2: "", bottom_1: "", bottom_2: "", left: "", right: "black" };
        room.tile_engine[9] = { name: "tile_engine_9", score: 7, bonus: "", top_1: "", top_2: "", bottom_1: "1_blue_input", bottom_2: "", left: "3_green_input", right: "black" };
        room.tile_engine[10] = { name: "tile_engine_10", score: 6, bonus: "green", top_1: "2_red_input", top_2: "", bottom_1: "3_green_input", bottom_2: "", left: "", right: "black" };
        room.tile_engine[11] = { name: "tile_engine_11", score: 4, bonus: "", top_1: "2_blue_input", top_2: "", bottom_1: "3_green_input", bottom_2: "", left: "", right: "3_red_output" };
        room.tile_engine[12] = { name: "tile_engine_12", score: 11, bonus: "", top_1: "1_red_input", top_2: "", bottom_1: "2_blue_input", bottom_2: "", left: "1_orange_input", right: "2_green_output" };
        room.tile_engine[13] = { name: "tile_engine_13", score: 13, bonus: "", top_1: "1_blue_input", top_2: "", bottom_1: "1_red_input", bottom_2: "", left: "", right: "black" };
        room.tile_engine[14] = { name: "tile_engine_14", score: 10, bonus: "", top_1: "1_orange_input", top_2: "", bottom_1: "", bottom_2: "", left: "2_blue_input", right: "1_red_output" };
        room.tile_engine[15] = { name: "tile_engine_15", score: 5, bonus: "all", top_1: "1_blue_input", top_2: "", bottom_1: "1_orange_input", bottom_2: "", left: "", right: "1_red_output" };
        room.tile_engine[16] = { name: "tile_engine_16", score: 7, bonus: "", top_1: "3_orange_input", top_2: "", bottom_1: "2_red_input", bottom_2: "", left: "", right: "2_green_output" };
        room.tile_engine[17] = { name: "tile_engine_17", score: 8, bonus: "", top_1: "2_red_input", top_2: "", bottom_1: "", bottom_2: "", left: "2_blue_input", right: "2_orange_output" };
        room.tile_engine[18] = { name: "tile_engine_18", score: 7, bonus: "orange", top_1: "2_blue_input", top_2: "", bottom_1: "1_green_input", bottom_2: "", left: "2_orange_input", right: "2_red_output" };
        room.tile_engine[19] = { name: "tile_engine_19", score: 11, bonus: "", top_1: "", top_2: "", bottom_1: "1_green_input", bottom_2: "", left: "2_red_output", right: "1_blue_output" };
        room.tile_engine[20] = { name: "tile_engine_20", score: 9, bonus: "", top_1: "", top_2: "", bottom_1: "2_red_input", bottom_2: "", left: "2_green_input", right: "1_blue_output" };
        room.tile_engine[21] = { name: "tile_engine_21", score: 3, bonus: "red", top_1: "", top_2: "1_blue_output", bottom_1: "", bottom_2: "", left: "3_red_input", right: "" };
        room.tile_engine[22] = { name: "tile_engine_22", score: 10, bonus: "", top_1: "1_red_input", top_2: "", bottom_1: "1_green_output", bottom_2: "", left: "3_orange_input", right: "" };
        room.tile_engine[23] = { name: "tile_engine_23", score: 5, bonus: "", top_1: "", top_2: "3_red_output", bottom_1: "2_orange_input", bottom_2: "", left: "2_red_input", right: "" };
        room.tile_engine[24] = { name: "tile_engine_24", score: 5, bonus: "", top_1: "", top_2: "", bottom_1: "3_blue_input", bottom_2: "", left: "", right: "black" };
        room.tile_engine[25] = { name: "tile_engine_25", score: 10, bonus: "", top_1: "1_orange_input", top_2: "", bottom_1: "", bottom_2: "black", left: "3_red_input", right: "" };
        room.tile_engine[26] = { name: "tile_engine_26", score: 5, bonus: "", top_1: "1_blue_input", top_2: "", bottom_1: "", bottom_2: "3_orange_output", left: "", right: "" };
        room.tile_engine[27] = { name: "tile_engine_27", score: 6, bonus: "", top_1: "", top_2: "", bottom_1: "1_orange_input", bottom_2: "", left: "3_blue_input", right: "3_green_output" };
        room.tile_engine[28] = { name: "tile_engine_28", score: 6, bonus: "", top_1: "", top_2: "", bottom_1: "", bottom_2: "", left: "2_green_input", right: "black" };
        room.tile_engine[29] = { name: "tile_engine_29", score: 7, bonus: "", top_1: "2_green_input", top_2: "", bottom_1: "3_red_input", bottom_2: "", left: "", right: "1_red_output" };
        room.tile_engine[30] = { name: "tile_engine_30", score: 4, bonus: "", top_1: "3_green_input", top_2: "", bottom_1: "", bottom_2: "", left: "", right: "1_red_output" };
        room.tile_engine[31] = { name: "tile_engine_31", score: 7, bonus: "", top_1: "", top_2: "2_orange_output", bottom_1: "1_orange_input", bottom_2: "", left: "3_green_input", right: "" };
        room.tile_engine[32] = { name: "tile_engine_32", score: 6, bonus: "blue", top_1: "3_green_input", top_2: "", bottom_1: "1_blue_input", bottom_2: "", left: "", right: "1_orange_output" };
        room.tile_engine[33] = { name: "tile_engine_33", score: 9, bonus: "", top_1: "1_orange_input", top_2: "", bottom_1: "1_blue_input", bottom_2: "", left: "", right: "2_orange_output" };
        room.tile_engine[34] = { name: "tile_engine_34", score: 1, bonus: "", top_1: "", top_2: "", bottom_1: "", bottom_2: "", left: "3_orange_input", right: "3_green_output" };
        room.tile_engine[35] = { name: "tile_engine_35", score: 10, bonus: "", top_1: "2_blue_input", top_2: "", bottom_1: "2_green_input", bottom_2: "", left: "", right: "1_orange_output" };
        room.tile_engine[36] = { name: "tile_engine_36", score: 6, bonus: "", top_1: "", top_2: "", bottom_1: "2_orange_input", bottom_2: "", left: "1_green_input", right: "3_red_output" };
        room.tile_engine[37] = { name: "tile_engine_37", score: 11, bonus: "", top_1: "1_green_input", top_2: "", bottom_1: "", bottom_2: "", left: "2_orange_input", right: "black" };
        room.tile_engine[38] = { name: "tile_engine_38", score: 9, bonus: "", top_1: "2_red_input", top_2: "", bottom_1: "", bottom_2: "", left: "1_green_input", right: "2_orange_output" };
        room.tile_engine[39] = { name: "tile_engine_39", score: 6, bonus: "", top_1: "1_red_input", top_2: "", bottom_1: "", bottom_2: "", left: "1_blue_input", right: "3_green_output" };
        room.tile_engine[40] = { name: "tile_engine_40", score: 3, bonus: "", top_1: "", top_2: "", bottom_1: "", bottom_2: "", left: "3_blue_input", right: "2_red_output" };
        room.tile_engine[41] = { name: "tile_engine_41", score: 6, bonus: "", top_1: "", top_2: "2_blue_output", bottom_1: "3_orange_input", bottom_2: "", left: "1_blue_input", right: "" };
        room.tile_engine[42] = { name: "tile_engine_42", score: 5, bonus: "", top_1: "", top_2: "", bottom_1: "", bottom_2: "", left: "2_orange_input", right: "1_orange_output" };
        room.tile_engine[43] = { name: "tile_engine_43", score: 6, bonus: "", top_1: "3_blue_input", top_2: "", bottom_1: "", bottom_2: "", left: "3_red_input", right: "1_red_output" };
        room.tile_engine[44] = { name: "tile_engine_44", score: 8, bonus: "", top_1: "2_green_input", top_2: "", bottom_1: "", bottom_2: "1_green_output", left: "2_red_input", right: "" };
        room.tile_engine[45] = { name: "tile_engine_45", score: 4, bonus: "", top_1: "", top_2: "2_green_output", bottom_1: "1_green_input", bottom_2: "", left: "", right: "" };
        room.tile_engine[46] = { name: "tile_engine_46", score: 7, bonus: "", top_1: "2_orange_input", top_2: "", bottom_1: "", bottom_2: "", left: "2_blue_input", right: "2_green_output" };
        room.tile_engine[47] = { name: "tile_engine_47", score: 10, bonus: "", top_1: "", top_2: "", bottom_1: "1_blue_input", bottom_2: "", left: "2_green_input", right: "2_red_output" };
        room.tile_engine[48] = { name: "tile_engine_48", score: 5, bonus: "", top_1: "", top_2: "3_blue_output", bottom_1: "1_orange_input", bottom_2: "", left: "3_red_input", right: "" };
        room.tile_engine[49] = { name: "tile_engine_49", score: 4, bonus: "", top_1: "3_green_input", top_2: "", bottom_1: "3_red_input", bottom_2: "", left: "", right: "3_orange_output" };
        room.tile_engine[50] = { name: "tile_engine_50", score: 8, bonus: "", top_1: "3_orange_input", top_2: "", bottom_1: "3_blue_input", bottom_2: "", left: "", right: "black" };
        room.tile_engine[51] = { name: "tile_engine_51", score: 2, bonus: "", top_1: "", top_2: "", bottom_1: "", bottom_2: "", left: "2_green_input", right: "3_blue_output" };
        room.tile_engine[52] = { name: "tile_engine_52", score: 14, bonus: "", top_1: "1_orange_input", top_2: "", bottom_1: "1_blue_input", bottom_2: "", left: "2_green_input", right: "black" };
        room.tile_engine[53] = { name: "tile_engine_53", score: 9, bonus: "", top_1: "3_orange_input", top_2: "", bottom_1: "", bottom_2: "1_blue_output", left: "1_green_input", right: "" };
        room.tile_engine[54] = { name: "tile_engine_54", score: 5, bonus: "", top_1: "", top_2: "", bottom_1: "2_orange_input", bottom_2: "", left: "", right: "2_blue_output" };
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
        var needTile = new Array();
        var countScore = new Array();
        var posTypeRowNum = new Array();
        var posTypeColNum = new Array();
        var posTypeRotateNum = new Array();
        var posType = ["top_1", "top_2", "bottom_1", "bottom_2", "left", "right"];
        var result = 0;
        var engineNum, engineAttr, row, col, rotate, needTileRow, needTileCol, needTileRotate, needTileType, needTileInputOrOutput;
        Room.findOne({ _id: req.query.roomId }, function(err, roomValue) {
            for (var j = 0; j < req.body.complete.length; j++) {
                //받아온 배열을 _engine_으로 자르고 엔진의 번호를 구함. 
                if (req.body.complete[j].name.split("tile_engine_")[1]) {
                    //엔진의 번호를 engineAttr에 담음
                    engineNum = req.body.complete[j].name.split("tile_engine_")[1];
                    engineAttr = roomValue.tile_engine[engineNum];
                    row = parseInt(req.body.complete[j].row);
                    col = parseInt(req.body.complete[j].col);
                    rotate = parseInt(req.body.complete[j].rotate);
                    if (rotate === 0) {
                        posTypeRowNum = [-1, -1, 1, 1, 0, 0];
                        posTypeColNum = [0, 1, 0, 1, -1, 2];
                        posTypeRotateNum = [2, 2, 0, 0, 3, 3];
                    } else if (rotate === 1) {
                        posTypeRowNum = [0, 1, 0, 1, -1, 2];
                        posTypeColNum = [1, 1, -1, -1, 0, 0];
                        posTypeRotateNum = [3, 3, 1, 1, 2, 0];
                    } else if (rotate === 2) {
                        posTypeRowNum = [1, 1, -1, -1, 0, 0];
                        posTypeColNum = [1, 0, 1, 0, 2, -1];
                        posTypeRotateNum = [0, 0, 2, 2, 3, 1];
                    } else if (rotate === 3) {
                        posTypeRowNum = [1, 0, 1, 1, 2, -1];
                        posTypeColNum = [-1, -1, 1, 2, 0, 0];
                        posTypeRotateNum = [1, 1, 3, 3, 0, 2];
                    }
                    for (var i = 0; i < posType.length; i++) {
                        if (engineAttr[posType[i]] !== "") {
                            needTile.push({ row: row + posTypeRowNum[i], col: col + posTypeColNum[i], type: engineAttr[posType[i]], rotate: posTypeRotateNum[i] });
                        }
                    }
                    checkTile(needTile, req.body.complete);
                    result += checkTile(needTile, req.body.complete, result);
                    // for (var k = 0; k < needTile.length; k++) {
                    //     
                    //     // console.log(needTileRow, needTileCol, needTileType, needTileInputOrOutput, needTileRotate, needTileType.split("_")[1]);
                    //     // result += checkTile(needTileRow, needTileCol, needTileType, needTileInputOrOutput, needTileRotate, req.body.complete);
                        // checkTile(needTile, req.body.complete);
                    //     // console.log("checkTile() 후 다시 돌아온 값 : ", checkTile(needTileRow, needTileCol, needTileType, needTileInputOrOutput, needTileRotate, req.body.complete));
                    //     // console.log("checkTile - needTileCol 재확인 : ", needTileCol);
                    // }
                    // console.log("checkTile - needTileCol 재확인() : ", checkTile(needTileRow, needTileCol, needTileType, needTileInputOrOutput, needTileRotate, req.body.complete));
                    console.log(result);
                    if (result === needTile.length && result !== 0) {
                        for (var j = 0; j < req.body.complete.length; j++) {
                            var tileValue = req.body.complete[j].split("@")[0];
                            var rowValue = parseInt(req.body.complete[j].split("@")[1]);
                            var colValue = parseInt(req.body.complete[j].split("@")[2]);
                            var rotateValue = parseInt(req.body.complete[j].split("@")[3]);
                            var savedValue = req.body.complete[j].split("@")[4];
                            var indexValue = 10 * (rowValue - 1) + colValue;
                            var memberValue = 0;
                            for (var i = 0; i < roomValue.member.length; i++) {
                                if (roomValue.member[i] === req.user.user_nick) memberValue = i;
                            }
                            var setTileKey = "player." + memberValue + ".build." + indexValue + ".tile";
                            var setRotateKey = "player." + memberValue + ".build." + indexValue + ".rotate";
                            var setQuery = {};
                            // console.log(tileValue);
                            setQuery[setTileKey] = tileValue;
                            if (rotateValue > 0) setQuery[setRotateKey] = rotateValue;
                            // console.log(setQuery);
                            var incKeyTile = "player." + memberValue + "." + tileValue;
                            var incQuery = {};
                            if (savedValue === "saved") {
                                incQuery[incKeyTile] = 0;
                            } else {
                                countScore.push(req.body.complete[j]);
                                incQuery[incKeyTile] = -1;
                                // console.log(countScore);
                            }
                            Room.update({ _id: req.query.roomId }, { $set: setQuery, $inc: incQuery }, function(err) {});
                        }
                        var incQuery = { round: 1 };
                        var incKeyScore = "player." + memberValue + ".score";
                        incQuery[incKeyScore] = parseInt(engineAttr.score - countScore.length + 1);
                        // console.log(engineAttr.score,"engineAttr.score");
                        // console.log(countScore.length,"countScore.length");
                        // console.log(incQuery,"incQuery");
                        Room.update({ _id: req.query.roomId, player: { $elemMatch: { nick: req.user.user_nick } } }, { $set: { 'player.$.select_engine': "아직" }, $inc: incQuery }, function(err) {
                            res.send({ result: "성공", score: incQuery[incKeyScore] });
                        });
                        break;
                    } else {
                        console.log("에너지 유출 중");
                        // console.log("checkTile - needTileCol 재확인() : ", checkTile(needTileRow, needTileCol, needTileType, needTileInputOrOutput, needTileRotate, req.body.complete));
                        res.send({ result: "에너지 유출 중", needTile: needTile });
                        break;
                    }
                }
            }
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

function checkTile(needTile, complete, result) {
    console.log("needTile : ", needTile);
    console.log("complete : ", complete);
    console.log(result);
    for (var m = 0; m < complete.length; m++) {
        row = parseInt(complete[m].row);
        col = parseInt(complete[m].col);
        rotate = parseInt(complete[m].rotate);
        name = complete[m].name;
        for (var n = 0; n < needTile.length; n++) {
            needTileRow = needTile[n].row;
            needTileCol = needTile[n].col;
            needTileRotate = needTile[n].rotate;
            needTileType = needTile[n].type;
            needTileInputOrOutput = needTile[n].type.split("_")[2];
            //필요한 타일의 row 값과 col 값을 구해서 유저가 던진 데이터와 비교 함 
            //위치값 매칭이 됐다면 그게 충족되는 값인지 체크
            if (needTileRow === row && needTileCol === col) {
                if (name === "tile_white") {
                    if (needTileInputOrOutput === "output" && needTileRotate === rotate) {
                        result ++;
                        console.log("화이트 타일 result 증가", result);
                    }
                } else if (name === "tile_black") {
                    if (needTileType === "black" && needTileRotate === complete[m].split("@")[3]) {
                        result ++;
                        console.log("블랙 타일 result 증가", result);
                    }
                } else if (name === "tile_way_1") {
                    console.log(needTileInputOrOutput);
                    // if ((needTileInputOrOutput === "input" && 3 - parseInt(complete[m].split("@")[3]) === needTileRotate) || (needTileInputOrOutput === undefined && complete[m].split("@")[3] === needTileRotate)) {
                    // if (needTileInputOrOutput === "input") {
                        if(needTileRotate === 0) {
                            needTile[n].row ++;
                        } else if(needTileRotate === 1) {
                            needTile[n].col --;
                        } else if(needTileRotate === 2) {
                            needTile[n].row --;
                        } else if(needTileRotate === 3) {
                            needTile[n].col ++;
                        }
                        return needTile;
                    // }
                } else if (name === "tile_way_2") {
                    if(needTileRotate === "undefined") {
                        console.log("tile_way_2에 undefined");
                        needTile[n].row ++;
                    } else if(needTileRotate === "1") {
                        console.log("tile_way_2에 1");
                        needTile[n].row ++;
                        needTile[n].col --;
                    } else if(needTileRotate === "2") {
                        console.log("tile_way_2에 2");
                        needTile[n].row ++;
                        needTile[n].col ++;
                    } else if(needTileRotate === "3") {
                        console.log("tile_way_2에 3");
                        needTileRotate += 2;
                        needTile[n].row --;
                    }
                    return checkTile(needTileRow, needTileCol, needTileType, needTileInputOrOutput, needTileRotate, complete);
                } else if (name === "tile_way_3") {
                    // console.log("way");
                } else if (name === "tile_way_4") {
                    // console.log("way");
                } else if (name === "tile_way_5") {
                    // console.log("way");
                } else if (name === "tile_way_6") {
                    // console.log("way");
                } else {
                    if (needTileType.split("_")[1] === name.split("tile_energy_")[1]) {
                        result ++;
                        console.log(needTileType.split("_")[1], "에너지 타일 result 증가", result);
                    }
                }
            }
        }
    }
    return result;
}