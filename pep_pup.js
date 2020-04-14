//page.$() method to access the Selectors API method querySelector() on the document, and page.$$() as an alias to querySelectorAll().

let fs = require('fs');
let puppeteer = require('puppeteer');
let path = require('path');
let cfile = process.argv[2];
let mfile = process.argv[3];
let cname = process.argv[4];
let courseurl; //global variable
(async function () {
    try {
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            slowMo: 25,
            args: ['--start-maximized', '--disable-notifications']
        });
        let content = await fs.promises.readFile(cfile, 'utf-8');
        let object = JSON.parse(content);
        let username = object.username;
        let password = object.password;
        let url = object.url;
        let pages = await browser.pages();
        let page = pages[0];
        page.goto(url, {
            waitUntil: 'networkidle0'
        });
        await page.waitForSelector('button[type=submit]', { visible: true });
        await page.type('input[type=email]', username);
        await page.type('input[type=password]', password);
        await page.click('button[type=submit]');
        await page.waitForSelector('div.resource a', { visible: true });
        let resourcePageLink = await page.$('div.resource a'); //$ selector is used to select elements on a page   
        let resourcePageHref = await resourcePageLink.evaluate(function (element) {
            return element.getAttribute('href');
        }); //also we can use resourcePageLink.evaluate(element=>element.getAttribute('href'));  
        page.goto(path.join(page.url(), resourcePageHref), {
            waitUntil: 'networkidle0'
        });
        await page.waitForNavigation({ waitUntil: 'networkidle0' });//wait for server response to our request
        await page.waitForSelector('div#siteOverlay', { visible: false }); //wait for overlay till it loads fully(wait for page to fully render, conversion of html data into visible elements)
        let courses = await page.$$('h2.courseInput'); //$$ selects all courses
        for (let i = 0; i < courses.length; i++) {
            let courseText = await courses[i].evaluate(function (element) {
                return element.textContent; //evaluate() helps to access document object (runs on browser console), returns DOM API
            })                       // .textcontent returns string (text) in JS  
            courseText = courseText.trim(); //removes extra spacing
            if (courseText === cname) {
                await courses[i].click();
                break;
            }
        }
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        courseurl = await page.url();
        let metadataPromise = await fs.promises.readFile(mfile);
        let metadata = await JSON.parse(metadataPromise);
        for (let i = 0; i < metadata.questions.length; i++) {
            await solveQuestion(page, metadata.questions[i]);
        }
    } catch (error) {
        console.log(error);
    }
})();

async function solveQuestion(page, question) {
    try {
        await openQuestion(page, question);
        await page.waitForSelector('.editorTab', { visible: true });
        await page.click('.editorTab');
        await page.waitForSelector('textarea.ace_text-input');
        await page.click('textarea.ace_text-input'); //black screen editor
        await page.keyboard.down('Control'); //.down, key on its way down
        await page.keyboard.press('A'); //.press, key is pressed
        await page.keyboard.up('Control'); //.up, key is released
        await page.keyboard.press('Delete');
        await page.click('.testCase'); //white text box on side of black box
        let codeFile = await fs.promises.readFile(path.join(question.path, 'main.java'), 'utf-8');
        await page.type('#customInput', codeFile); //customInput is id selector of white box
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.down('Control');
        await page.keyboard.press('X');
        await page.keyboard.up('Control');
        await page.click('textarea.ace_text-input');
        await page.keyboard.down('Control');
        await page.keyboard.press('V');
        await page.keyboard.up('Control');
        await page.click('#submitCode');
        await page.waitForSelector('#testCases'); //testCases is id selector of test cases of question that apperas after submission
        let testCases = await page.$$('#testCases'); //to select all 5 testcase
        let testCasesValArr = [];
        for (let i = 0; i < testCases.length; i++) {
            let testCase = await testCases[i].$$('input[type=hidden]'); //it selects test cases results all input, expected output and actual output
            let testCaseArr = [];
            let testCaseInput = await testCase[0].evaluate(function (element) {
                return element.getAttribute('value'); //value stores test case result
            });
            let testCaseExpectedOutput = await testCase[1].evaluate(function (element) {
                return element.getAttribute('value');
            });
            let testCaseActualOutput = await testCase[2].evaluate(function (element) {
                return element.getAttribute('value');
            });
            testCaseArr = [testCaseInput, testCaseExpectedOutput, testCaseActualOutput];
            testCasesValArr.push(testCaseArr);
        }
        let testCaseObject = testCasesValArr.map(function (allTestCases) {
            return {
                input: allTestCases[0],
                expectedOutput: allTestCases[1],
                actualOutput: allTestCases[2]
            }
        });
        await fs.promises.writeFile(path.join(question.path, 'tc.json'), JSON.stringify(testCaseObject));
    } catch (error) {
        console.log(error);
    }
}

async function openQuestion(page, question) {
    try {
        page.goto(courseurl, {
            waitUntil: 'networkidle0'
        });
        await page.waitForNavigation({waitUntil:'networkidle0'});
        await page.waitForSelector('ul.tabs div.hoverable');
        let allModules = await page.$$('ul.tabs div.hoverable');
        for (let i = 0; i < allModules.length; i++) {
            let moduleText = await allModules[i].evaluate(function (element) {
                return element.textContent;
            });
            if (moduleText.trim() === question.module) {
                await allModules[i].click();
                break;
            }
        }
        await page.waitForNavigation({waitUntil:'networkidle0'});
        await page.waitForSelector(".collection-item ", { visible: true });
        let allLectures = await page.$$('.collection-item'); //class selector of lectures 
        for (let i = 0; i < allLectures.length; i++) {
            let lectureText = await allLectures[i].evaluate(function (element) {
                return element.textContent;
            });
            if (lectureText.trim() === question.lecture) {  //trim to remove extra spaces
                await allLectures[i].click();
                break;
            }
        }
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await page.waitForSelector("ul.collection li.collection-item p", { visible: true });
        let allQuestions = await page.$$('ul.collection li.collection-item p');
        for (let i = 0; i < allQuestions.length; i++) {
            let questionText = await allQuestions[i].evaluate(function (element) {
                return element.textContent.trim();
            });
            if (questionText.includes(question.title)) {
                await allQuestions[i].click();
                break;
            }
        }
    } catch (error) {
        console.log(error);
    }
}