let fs = require('fs');
require('chromedriver');
let swd = require('selenium-webdriver');
let path = require("path");
let driver = new swd.Builder().forBrowser('chrome').build();  //to build anutomated driver
let cfile = process.argv[2]; //credential file input
let mfile = process.argv[3]; //metadata file input
let cname = process.argv[4]; //course name input

let globalcourseElements, globalcourseIndex = 0, globalCourseurl, globalEditorTextBox, globalCustomInputBox, globalCode, globalModule, globalLecture, globalQuestion;
let username, password, metadata; //globalvar
let cfilePromise = fs.promises.readFile(cfile);
cfilePromise.then(function (content) { //to read content of credential file
    let credentials = JSON.parse(content);
    username = credentials.username;
    password = credentials.password;
}).then(function () {
    let toWillBeSetPromise = driver.manage().setTimeouts({  //it will not throw error immediately rather wait for 10 seconds
        implicit: 10000
    });
    return toWillBeSetPromise
}).then(function () {
    let loginPagePromise = driver.get('https://www.pepcoding.com/login');
    return loginPagePromise;
}).then(function () {
    let usernamePromise = driver.findElement(swd.By.css("input[type=email]"));
    let passwordPromise = driver.findElement(swd.By.css("input[type=password]"));
    let combinedPromise = Promise.all([usernamePromise, passwordPromise]);   //elements of array made by .all
    return combinedPromise;
}).then(function (elements) {
    let usernamePromise = elements[0].sendKeys(username);
    let passwordPromise = elements[1].sendKeys(password);
    let combinedPromise = Promise.all([usernamePromise, passwordPromise]);
    return combinedPromise;
}).then(function () {
    let buttonClickPromise = driver.findElement(swd.By.css("button[type=submit]"));
    return buttonClickPromise;
}).then(function (button) {
    let buttonClick = button.click();
    return buttonClick;
}).then(function () {     //approach 1 by waiting for link
    let resourcePageWaitPromise = driver.wait(swd.until.elementLocated(swd.By.css('div.resource a'))); //waits for resource page
    return resourcePageWaitPromise;
}).then(function (resLink) {
    let resourcePageReadPromise = resLink.getAttribute('href');
    return resourcePageReadPromise;
}).then(function (pageLoaded) {
    let resourcePageLoadPromise = driver.get(pageLoaded);
    return resourcePageLoadPromise;
}).then(function () {
    let siteOverlayFoundPromise = willWaitForOverLayToLoad();
    return siteOverlayFoundPromise;
}).then(function () {
    let coursesFoundPromise = driver.findElements(swd.By.css('h2.courseInput'))
    return coursesFoundPromise;
}).then(function (courses) {
    globalcourseElements = courses;
    let courseTextPromises = [];
    for (let i = 0; i < globalcourseElements.length; i++) {
        courseTextPromises.push(globalcourseElements[i].getText());
    }
    let combinedTextPromises = Promise.all(courseTextPromises);
    return combinedTextPromises;
}).then(function (courseTexts) {
    for (let i = 0; i < courseTexts.length; i++) {
        if (cname === courseTexts[i]) {
            globalcourseIndex = i;
            break;
        }
    }
    let courseElementClickPromise = globalcourseElements[globalcourseIndex].click();
    return courseElementClickPromise;
}).then(function () {
    let urlPromise = driver.getCurrentUrl();
    return urlPromise;
}).then(function (url) {
    globalCourseurl = url;
    let metadataPromise = fs.promises.readFile(mfile);
    return metadataPromise;
}).then(function (content) {
    metadata = JSON.parse(content);
    return Promise.resolve(undefined); //code will work even if we don't return it
}).then(function () {
    let pqp = solveQuestion(metadata.questions[0]);  //pqp : previous question promise
    for (let i = 1; i < metadata.questions.length; i++) {
        pqp = pqp.then(function () {
            let cqp = solveQuestion(metadata.questions[i]);  //cqp : current question promise
            return cqp;
        })
    }
    return pqp;
}).then(function () {
    console.log("Welcome !")
}).catch(function (error) {
    console.log(error);
}).finally(function () {
    //driver.quit();
});

function solveQuestion(question) {   //return promise
    return new Promise(function (resolve, reject) {
        let questionFetchPromise = openQuestion(question);
        questionFetchPromise.then(function () {
            let editorTabSelectedPromise = driver.findElement(swd.By.css(".editorTab"));
            return editorTabSelectedPromise;
        }).then(function (editorTab) {
            let editorClickedPromise = editorTab.click();
            return editorClickedPromise;
        }).then(function () {
            let textAreaSelectedPromise = driver.findElement(swd.By.css("textarea.ace_text-input"));
            return textAreaSelectedPromise;
        }).then(function (editortextArea) {
            globalEditorTextBox = editortextArea;
            let ctrlAPromise = globalEditorTextBox.sendKeys(swd.Key.CONTROL + "a"); //we can also use (swd.key.chord(swd.key.CONTROL, 'a'))
            return ctrlAPromise;
        }).then(function () {
            let deletePromise = globalEditorTextBox.sendKeys(swd.Key.DELETE);
            return deletePromise;
        }).then(function () {
            let codeFileReadPromise = fs.promises.readFile(path.join(question.path, "main.java"));
            return codeFileReadPromise;
        }).then(function (content) {
            globalCode = content + "";
            let customInputTextBoxPromise = driver.findElement(swd.By.css("#customInput"));
            return customInputTextBoxPromise;
        }).then(function (customInputTextBox) {
            globalCustomInputBox = customInputTextBox;
            let codeEnteredPromise = globalCustomInputBox.sendKeys(globalCode);
            return codeEnteredPromise;
        }).then(function () {
            let controlAPromise = globalCustomInputBox.sendKeys(swd.Key.chord(swd.Key.CONTROL, 'a'));
            return controlAPromise;
        }).then(function () {
            let controlXPromise = globalCustomInputBox.sendKeys(swd.Key.chord(swd.Key.CONTROL, 'x'));
            return controlXPromise;
        }).then(function () {
            let controlVPromise = globalEditorTextBox.sendKeys(swd.Key.chord(swd.Key.CONTROL, 'v'));
            return controlVPromise;
        }).then(function () {
            let submittedCodeFoundPromise = driver.findElement(swd.By.css('#submitCode'));
            return submittedCodeFoundPromise;
        }).then(function (buttonSubmit) {
            let buttonClickPromise = buttonSubmit.click();
            return buttonClickPromise;
        }).then(function () {
            let overlayLoadPromise = willWaitForOverLayToLoad();
            return overlayLoadPromise;
        }).then(function(){
            let testcasesWillBeFoundPromise = driver.findElements(swd.By.css('#testCases'));
            return testcasesWillBeFoundPromise;
        }).then(function(testcasesList){
            let testCaseHiddenElementsPromiseArr = [];
            for(let i = 0; i < testcasesList.length; i++){
                let testCasesHiddenElementsWillBeReadPromise = testcasesList[i].findElements(swd.By.css("input[type=hidden]"));
                testCaseHiddenElementsPromiseArr.push(testCasesHiddenElementsWillBeReadPromise);
            }
            return Promise.all(testCaseHiddenElementsPromiseArr);
        }).then(function(testCaseHiddenElements){
            let testCaseReadPromiseArr = [];
            for(let i = 0; i < testCaseHiddenElements.length; i++){
                let testCaseInputPromise = testCaseHiddenElements[i][0].getAttribute('value');
                let testCaseExpectedOutputPromise = testCaseHiddenElements[i][1].getAttribute('value');
                let testCaseActualOutputPromise = testCaseHiddenElements[i][2].getAttribute('value');
                let combinedPromise = Promise.all([testCaseInputPromise, testCaseExpectedOutputPromise, testCaseActualOutputPromise]);
                testCaseReadPromiseArr.push(combinedPromise);
            }
            return Promise.all(testCaseReadPromiseArr);
        }).then(function(testcases){
            let testCaseObject = testcases.map(function(testcase){
                return {
                    input: testcase[0],
                    expectedOutput: testcase[1],
                    actualOutput: testcase[2]
                }
            });
            let testCaseFileWritePromise = fs.promises.writeFile(path.join(question.path, "tc.json"), JSON.stringify(testCaseObject));
            return testCaseFileWritePromise;
        }).then(function () {
            console.log("successful submission");
        }).then(function () {
            resolve();
        }).catch(function (err) {
            reject(err);
        })
    });
}
function openQuestion(question) {
    return new Promise(function (resolve, reject) {
        let coursePageLoadPromise = driver.get(globalCourseurl);
        coursePageLoadPromise.then(function () {
            let waitForOverlayLoadPromise = willWaitForOverLayToLoad();
            return waitForOverlayLoadPromise;
        }).then(function () {
            let moduleElementReadPromise = driver.findElements(swd.By.css('ul.tabs div.hoverable'));
            return moduleElementReadPromise;
        }).then(function (moduleElements) {
            globalModule = moduleElements;
            let moduleTextPromiseArr = [];
            for (let i = 0; i < moduleElements.length; i++) {
                let moduleTextReadPromise = globalModule[i].getText();
                moduleTextPromiseArr.push(moduleTextReadPromise);
            }
            return Promise.all(moduleTextPromiseArr);
        }).then(function (moduleTexts) {
            let moduleElementClickedPromise;
            for (let i = 0; i < moduleTexts.length; i++) {
                if (question.module === moduleTexts[i].trim()) {
                    moduleElementClickedPromise = globalLecture[i].click();
                    break;
                }
            }
            return moduleElementClickedPromise;
        }).then(function () {
            let lectureElementReadPromise = driver.findElements(swd.By.css('ul.collection li.collection-item p.title'));
            return lectureElementReadPromise;
        }).then(function (lectureElements) {
            globalLecture = lectureElements;
            let lectureTextPromiseArr = [];
            for (let i = 0; i < globalLecture.length; i++) {
                let lectureTextReadPromise = globalLecture[i].getText();
                lectureTextPromiseArr.push(lectureTextReadPromise);
            }
            return Promise.all(lectureTextPromiseArr);
        }).then(function (lectureText) {
            let lectureClickPromise;
            for (let i = 0; i < lectureText.length; i++) {
                if (question.lecture === lectureText[i].trim()) {
                    lectureClickPromise = globalLecture[i].click();
                    break;
                }
            }
            return lectureClickPromise;
        }).then(function () {
            let waitForOverlayLoadPromise = willWaitForOverLayToLoad();
            return waitForOverlayLoadPromise;
        }).then(function () {
            let questionElementsWillBeReadPromise = driver.findElements(swd.By.css('ul.collection li.collection-item p'));
            return questionElementsWillBeReadPromise;
        }).then(function (questionElements) {
            globalQuestion = questionElements;
            let questionTextPromiseArr = [];
            for (let i = 0; i < globalQuestion.length; i++) {
                let questionTextPromise = globalQuestion[i].getText();
                questionTextPromiseArr.push(questionTextPromise);
            }
            return Promise.all(questionTextPromiseArr);
        }).then(function (questionText) {
            let questionClickedPromise;
            for (let i = 0; i < questionText.length; i++) {
                if (questionText[i].trim().includes(question.title) === true) {
                    questionClickedPromise = globalQuestion[i].click();
                    break;
                }
            }
            return questionClickedPromise;
        }).then(function () {
            resolve();
        }).catch(function (err) {
            reject(err);
        })
    });
}

function willWaitForOverLayToLoad() {
    return new Promise(function (resolve, reject) {
        let siteLayoverFoundPromise = driver.findElement(swd.By.css("div#siteOverlay"));
        siteLayoverFoundPromise.then(function (siteOverlayElement) {
            let waitForSiteOverlayToHidePromise = driver.wait(swd.until.elementIsNotVisible(siteOverlayElement), 10000);
            return waitForSiteOverlayToHidePromise;
        }).then(function () {
            resolve();
        }).catch(function (err) {
            reject(err);
        })
    });
}