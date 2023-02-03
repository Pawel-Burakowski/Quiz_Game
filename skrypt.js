let RENDERER = {
	RESIZE_INTERVAL: 0,
	RADIUS: 45,
	RATE: 0.55,

	init: function () {
		this.setParameters()
		this.setup()
		this.reconstructMethods()
		this.bindEvent()
		this.render()
	},

	setParameters: function () {
		this.$window = $(window)
		this.$container = $("#hex-container")
		this.$canvas = $("<canvas />")
		this.context = this.$canvas
			.appendTo(this.$container)
			.get(0)
			.getContext("2d")
		this.hexagons = []
		this.resizeIds = []
	},

	setup: function () {
		this.hexagons.length = 0
		this.resizeIds.length = 0
		this.width = this.$container.width()
		this.height = this.$container.height()
		this.$canvas.attr({ width: this.width, height: this.height })
		this.createHexagons()
	},

	getRandomValue: function (min, max) {
		return (min + (max - min) * Math.random()) | 0
	},

	createHexagons: function () {
		this.radius = this.RADIUS * this.RATE
		this.vertices = []

		for (var i = 0; i < 6; i++) {
			this.vertices.push({
				x: this.radius * Math.sin((Math.PI / 3) * i),
				y: -this.radius * Math.cos((Math.PI / 3) * i),
			})
		}
		this.vertices.push(this.vertices[0])
		this.hexWidth = this.RADIUS * Math.cos(Math.PI / 6) * 2
		this.hexHeight = this.RADIUS * (2 - Math.sin(Math.PI / 6))

		var countX = Math.ceil(this.width / this.hexWidth) + 1,
			countY = Math.ceil(this.height / this.hexHeight) + 1,
			offsetX = -(countX * this.hexWidth - this.width) / 2,
			offsetY = -(countY * this.hexHeight - this.height) / 2

		countX++

		for (var y = 0; y < countY; y++) {
			for (var x = 0; x < countX; x++) {
				this.hexagons.push(
					new HEXAGON(
						this,
						offsetX +
							(x + 0.5) * this.hexWidth -
							(y % 2 == 1 ? 0 : this.hexWidth / 2),
						offsetY + (y + 0.5) * this.hexHeight
					)
				)
			}
		}

		for (var y = 0; y < countY; y++) {
			for (var x = 0; x < countX; x++) {
				var hexagon = this.hexagons[y * countX + x]

				if (x < countX - 1) {
					hexagon.neighbors[0] = this.hexagons[y * countX + x + 1]
				}
				if ((x < countX - 1 || y % 2 == 0) && y < countY - 1) {
					hexagon.neighbors[1] =
						this.hexagons[(y + 1) * countX + x + (y % 2 == 1 ? 1 : 0)]
				}
				if ((x > 0 || y % 2 == 1) && y < countY - 1) {
					hexagon.neighbors[2] =
						this.hexagons[(y + 1) * countX + x + (y % 2 == 1 ? 0 : -1)]
				}
				if (x > 0) {
					hexagon.neighbors[3] = this.hexagons[y * countX + x - 1]
				}
				if ((x > 0 || y % 2 == 1) && y > 0) {
					hexagon.neighbors[4] =
						this.hexagons[(y - 1) * countX + x + (y % 2 == 1 ? 0 : -1)]
				}
				if ((x < countX - 1 || y % 2 == 0) && y > 0) {
					hexagon.neighbors[5] =
						this.hexagons[(y - 1) * countX + x + (y % 2 == 1 ? 1 : 0)]
				}
			}
		}
		this.hexagons[this.getRandomValue(0, this.hexagons.length - 1)].select()
	},

	watchWindowSize: function () {
		while (this.resizeIds.length > 0) {
			clearTimeout(this.resizeIds.pop())
		}
		this.tmpWidth = this.$window.width()
		this.tmpHeight = this.$window.height()
		this.resizeIds.push(
			setTimeout(this.jdugeToStopResize, this.RESIZE_INTERVAL)
		)
	},

	jdugeToStopResize: function () {
		var width = this.$window.width(),
			height = this.$window.height(),
			stopped = width == this.tmpWidth && height == this.tmpHeight

		this.tmpWidth = width
		this.tmpHeight = height

		if (stopped) {
			this.setup()
		}
	},

	reconstructMethods: function () {
		this.selectHexagon = this.selectHexagon.bind(this)
		this.watchWindowSize = this.watchWindowSize.bind(this)
		this.jdugeToStopResize = this.jdugeToStopResize.bind(this)
		this.render = this.render.bind(this)
	},

	selectHexagon: function (event) {
		var axis = this.getAxis(event)

		for (var i = 0, count = this.hexagons.length; i < count; i++) {
			this.hexagons[i].judge(axis.x, axis.y)
		}
	},

	getAxis: function (event) {
		var offset = this.$container.offset()
		return {
			x: event.clientX - offset.left + this.$window.scrollLeft(),
			y: event.clientY - offset.top + this.$window.scrollTop(),
		}
	},

	bindEvent: function () {
		this.$window.on("resize", this.watchWindowSize)
		this.$container.on("click", this.selectHexagon)
	},

	render: function () {
		requestAnimationFrame(this.render)

		this.context.fillStyle = "hsla(210, 70%, 10%, 0.3)"
		this.context.fillRect(0, 0, this.width, this.height)

		for (var i = 0, count = this.hexagons.length; i < count; i++) {
			this.hexagons[i].render(this.context)
		}
	},
}

var HEXAGON = function (renderer, x, y) {
	this.renderer = renderer
	this.x = x
	this.y = y
	this.init()
}

HEXAGON.prototype = {
	COUNT: { MIN: 5, MAX: 50 },
	LUMINANCE: { MIN: 10, MAX: 70 },

	init: function () {
		this.selections = []
		this.neighbors = new Array(6)
		this.sourceIndices = []
	},

	judge: function (x, y) {
		if (
			x < this.x - this.renderer.hexWidth / 2 ||
			x > this.x + this.renderer.hexWidth / 2 ||
			y < this.y - this.renderer.RADIUS ||
			y > this.y + this.renderer.RADIUS ||
			(y < this.y &&
				Math.abs((x - this.x) / (y - this.y + this.renderer.RADIUS)) >
					Math.tan(Math.PI / 3)) ||
			(y > this.y &&
				Math.abs((x - this.x) / (y - this.y - this.renderer.RADIUS)) >
					Math.tan(Math.PI / 3))
		) {
			return
		}
		this.select()
	},

	select: function () {
		this.hue = this.renderer.getRandomValue(100, 300)
		this.selections.push({ count: 0, hue: this.hue })
	},

	relate: function (sourceIndices) {
		this.sourceIndices.push(sourceIndices)
	},

	draw: function (context, targets) {
		for (var i = 0; i < targets.length; i++) {
			var target = targets[i],
				fillLuminance = 0,
				strokeLuminance = 0

			if (target.count < this.COUNT.MIN) {
				fillLuminance =
					this.LUMINANCE.MIN +
					(this.LUMINANCE.MAX - this.LUMINANCE.MIN) *
						Math.pow(
							Math.sin(((Math.PI / 2) * target.count) / this.COUNT.MIN),
							3
						)
			} else if (target.count < this.COUNT.MAX) {
				fillLuminance =
					this.LUMINANCE.MIN +
					(this.LUMINANCE.MAX - this.LUMINANCE.MIN) *
						Math.pow(
							Math.sin(
								(Math.PI / 2) *
									(1 +
										(target.count - this.COUNT.MIN) /
											(this.COUNT.MAX - this.COUNT.MIN))
							),
							3
						)
			}
			if (target.count < this.COUNT.MIN * 2) {
				strokeLuminance =
					this.LUMINANCE.MIN +
					(this.LUMINANCE.MAX - this.LUMINANCE.MIN) *
						Math.sin(((Math.PI / 2) * target.count) / this.COUNT.MIN / 2)
			} else if (target.count < this.COUNT.MAX * 2) {
				strokeLuminance =
					this.LUMINANCE.MIN +
					(this.LUMINANCE.MAX - this.LUMINANCE.MIN) *
						Math.sin(
							(Math.PI / 2) *
								(1 +
									(target.count - this.COUNT.MIN * 2) /
										(this.COUNT.MAX - this.COUNT.MIN) /
										2)
						)
			}
			context.fillStyle =
				"hsla(" + target.hue + ", 70%, " + fillLuminance + "%, 0.3)"
			context.fill()
			context.strokeStyle =
				"hsla(" + target.hue + ", 70%, " + strokeLuminance + "%, 0.3)"
			context.stroke()
		}
	},

	render: function (context) {
		context.save()
		context.globalCompositeOperation = "lighter"
		context.translate(this.x, this.y)
		context.beginPath()

		for (var i = 0, vertices = this.renderer.vertices; i < 6; i++) {
			context[i == 0 ? "moveTo" : "lineTo"](vertices[i].x, vertices[i].y)
		}
		context.closePath()
		context.fillStyle = "hsla(210, 70%, " + this.LUMINANCE.MIN + "%, 0.3)"
		context.fill()

		this.draw(context, this.selections)
		this.draw(context, this.sourceIndices)
		context.restore()

		for (var i = this.selections.length - 1; i >= 0; i--) {
			var selection = this.selections[i]

			if (selection.count == this.COUNT.MIN) {
				for (var j = 0; j < 6; j++) {
					if (this.neighbors[j]) {
						var indices = []

						for (var k = 0; k < 3; k++) {
							var index = j - 1 + k
							index += 6
							index %= 6
							indices.push(index)
						}
						this.neighbors[j].relate({
							indices: indices,
							hue: this.hue,
							count: 0,
						})
					}
				}
			}
			if (++selection.count == this.COUNT.MAX * 2) {
				this.selections.splice(i, 1)
			}
		}
		for (var i = this.sourceIndices.length - 1; i >= 0; i--) {
			var indices = this.sourceIndices[i],
				index = indices.indices[this.renderer.getRandomValue(0, 3)]

			if (this.neighbors[index] && indices.count == this.COUNT.MIN) {
				this.neighbors[index].relate({
					indices: indices.indices,
					hue: indices.hue,
					count: 0,
				})
			}
			if (++indices.count == this.COUNT.MAX * 2) {
				this.sourceIndices.splice(i, 1)
			}
		}
	},
}

$(function () {
	RENDERER.init()
})


//get of all variables
const timeLeft = document.querySelector(".time-left");
const quizContainer = document.getElementById("questions");
const nextBtn = document.getElementById("next-button");
const countOfQuestion = document.querySelector(".number-of-question");
const displayContainer = document.getElementById("main-container");
const scoreContainer = document.querySelector(".score-container");
const restart = document.getElementById("restart-button");
const userScore = document.getElementById("user-score");
const startScreen = document.querySelector(".initial-screen");
const startButton = document.getElementById("start-button");
let scoreCount = 0;
let questionCount;
let countdown;

const quizArray = [
    {
        id: "0",
        question: "Co oznacza skrót www?",
        options: ["Wielka Wyszukiwarka Wiadomości", "Word Wide Web", "Wyszukiwarka Wszystkich Wiadomości", "Word Web Wide"],
        correct: "Word Wide Web",
    },
    {
        id: "1",
        question: "W jaki sposób przekształcić tablicę na tekst, w którym kolejne elementy będą oddzielone od siebie określonym separatorem??",
        options: ["Array.prototype.join(separator)", "Array.prototype.toString()", "Array.prototype.concat(separator)", "Array.prototype.push()"],
        correct: "Array.prototype.join(separator)",
    },
    {
        id: "2",
        question: "Po czyjej stronie wykonywana jest operacja JavaScript?",
        options: ["Po stronie użytkownika", "Po stronie serwera", "Po stronie użytkownika i serwera", "Żadna z powyższych"],
        correct: "Po stronie użytkownika",
    },
    {
        id: "3",
        question: "Jak dodać przestrzeń między obramowaniem a wewnętrzną zawartością elementu?",
        options: ["margin", "padding", "border", "spacing"],
        correct: "padding",
    },
    {
        id: "4",
        question: "Kto tworzy standardy internetowe?",
        options: ["Google", "Microsoft", "Mozilla", "W3C"],
        correct: "W3C",
    },
    {
        id: "5",
        question: "Jak sprawdzić, czy w tablicy występuje określony elementy?",
        options: ["Za pomocą parametru indexOf", "Za pomocą parametru reverse", "Za pomocą parametru sort", "Za pomocą parametru shift"],
        correct: "Za pomocą parametru indexOf",
    },
	{
        id: "6",
        question: "Pliki skryptów Java Script mają zazwyczaj rozszerzenie:",
        options: ["*.java", "*.script", "*.js", "*.javascript"],
        correct: "*.js",
    },
    {
        id: "7",
        question: "Instrukcja warunkowa rozpoczyna się od instrukcji:",
        options: ["if", "while", "for", "do...while"],
        correct: "if",
    },
    {
        id: "8",
        question: "Jak zapisać liczbę ze stałą liczbą miejsc po przecinku (np. kwota)?",
        options: ["toFixed", "toPrecision", "toPrecision(n)", "valueOf"],
        correct: "toFixed",
    },
    {
        id: "9",
        question: "Który z operatorów wykorzystujemy do tworzenia pętli?",
        options: ["if", "else", "for", "let"],
        correct: "for",
    },
	{
        id: "10",
        question: "Która z operacji jest poprawną instrukcją przypisania?",
        options: ["X:=3", "X==3", "X=3", "X===3"],
        correct: "X=3",
    },
	{
        id: "11",
        question: "Jak pobrać określony znak tekstu?",
        options: ["String.prototype.concat()", "String.prototype.charAt()", "String.prototype.replace()", "String.prototype.valueOf()"],
        correct: "String.prototype.charAt()",
    },
	{
        id: "12",
        question: "Które z poniższych NIE jest poprawnym sposobem deklarowania tablicy w JavaScript?",
        options: ["var arr = new Array();", "var arr = [1, 2, 3, 4];", "var [] = new Number() [5];", "Każdy zapis jest poprawny"],
        correct: "var [] = new Number() [5];",
    },
	{
        id: "13",
        question: "Który z poniższych elementów wypisze w okienku alertu komunikat Hello World?",
        options: ["alertBox(“Hello World”);", "alert(Hello World);", "msgAlert(“Hello World”);", "alert(“Hello World”);"],
        correct: "alert(“Hello World”);",
    },
	{
        id: "14",
        question: "Która metoda wbudowana łączy tekst dwóch ciągów i zwraca nowy ciąg?",
        options: ["append()", "concat()", "attach()", "żadna z tych metod"],
        correct: "concat()",
    },
]


//Start of the game: hide quiz and display start screen
window.onload = () => 
{
    displayContainer.classList.add("hide");			//hide quiz container
    startScreen.classList.remove("hide");			//show Start Button
};

//Click on start button
startButton.addEventListener("click", () => 
{
    displayContainer.classList.remove("hide");		//show quiz container
    startScreen.classList.add("hide");				//hide Start Button
    initial();
});

//initial setup
function initial()
{
    quizContainer.innerHTML = "";		//1.step: clear the question fields
    questionCount = 0;
    scoreCount = 0;
    count = 15;							//time

    clearInterval(countdown);
    timerDisplay();
    quizCreator();
    quizDisplay(questionCount);
}

//Timer
const timerDisplay = () => 
{
    countdown = setInterval(() => 
	{
        count--;
        timeLeft.innerHTML = `${count} s`;
        if (count === 0)
		{
			timeLeft.innerHTML = `15 s`
			clearInterval(countdown);
            displayNext();
        }
    }, 1000);
};

//Quiz Creation
function quizCreator()
{
    quizArray.sort(() => Math.random() - 0.5);		//Math.random() will give you random numbers that are roughly 50% negative and 50% positive
		console.log(quizArray);						//mixed up Array
							
    for (let i of quizArray) 
	{
        i.options.sort(() => Math.random() - 0.5);		//mixed up of options

        let div = document.createElement("div");		//quiz div creation
        div.classList.add("container-mid", "hide");
        
        countOfQuestion.innerHTML = "1 z " + quizArray.length + " pytań";

        let question_DIV = document.createElement("p");
        question_DIV.classList.add("question");
        question_DIV.innerHTML = i.question;
        div.appendChild(question_DIV);
        //options
        div.innerHTML += 
		`
    	<button class="option-div" onclick="checker(this)">${i.options[0]}</button>
    	<button class="option-div" onclick="checker(this)">${i.options[1]}</button>
      	<button class="option-div" onclick="checker(this)">${i.options[2]}</button>
       	<button class="option-div" onclick="checker(this)">${i.options[3]}</button>
    	`;
        quizContainer.appendChild(div);
    }
}

nextBtn.addEventListener("click", (displayNext = () => 
{
    questionCount += 1;		//increment questionCount

    if (questionCount == quizArray.length) 
	{
		displayContainer.classList.add("hide");
		scoreContainer.classList.remove("hide");
    	userScore.innerHTML = "Twój wynik to " + scoreCount + " z " + questionCount + " pytań";
    } 
	else 
	{
		countOfQuestion.innerHTML =  questionCount + 1 + " z " + quizArray.length + " pytań";
		quizDisplay(questionCount);
		timeLeft.innerHTML = `15 s`
		count = 15;
		clearInterval(countdown);
		timerDisplay();
    }
    })
)

//Display quiz
const quizDisplay = (questionCount) => 
{
    let quizCards = document.querySelectorAll(".container-mid");
    //Hide other cards
    quizCards.forEach((card) => 
	{
		console.log(quizCards);					//show me all of quizCards
        card.classList.add("hide");				//assign for each element "hide"
    });
    //display current question card
    quizCards[questionCount].classList.remove("hide");
}

//Checker Function to check if option is correct or not
function checker(userOption) 
{
    let userSolution = userOption.innerText;
    let question = document.getElementsByClassName("container-mid")[questionCount];
    let options = question.querySelectorAll(".option-div");

    //if user clicked answer == correct option stored in object
    if (userSolution === quizArray[questionCount].correct) 
	{
        userOption.classList.add("correct");
        scoreCount++;
    } 
	else 
	{
        userOption.classList.add("incorrect");
        //For marking the correct option
        options.forEach((element) => 
		{
            if (element.innerText == quizArray[questionCount].correct) 
			{
                element.classList.add("correct");
            }
        });
    }

    //clear interval(stop timer)
    clearInterval(countdown);
    //disable all options
    options.forEach((element) => {
        element.disabled = true;
    });
}

//Restart Quiz
restart.addEventListener("click", () => {
    initial();
    displayContainer.classList.remove("hide");
    scoreContainer.classList.add("hide");
});