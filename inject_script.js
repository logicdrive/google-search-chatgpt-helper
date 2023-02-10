async function main()
{
    const PARA_QUERY = Browser.url_Query_Param("q")
    if(!PARA_QUERY.endsWith("?")) return
    const CHAT_QUERY = PARA_QUERY.slice(0, -1)

    ACCESS_TOKEN = await ChatGPT_API.get_Access_Token()
    if(ACCESS_TOKEN == undefined)
    {
        const CHATGPT_OUTPUT_MANAGER = new ChatGPT_Output_Manager((e)=>{})
        CHATGPT_OUTPUT_MANAGER.create_New_Message_Element().innerHTML = `<a href="https://chat.openai.com/auth/login" target="_blank">Please login to ChatGPT &gt;</a>`
        return
    }

    CHATGPT_OUTPUT_MANAGER = new ChatGPT_Output_Manager(async (e) => {
        document.querySelector("#ChatGPT_Input_Btn").disabled = true
        const CONVERSATION_ID = e.target.getAttribute("conversation_id")
        const INPUT_MESSAGE = document.querySelector("#ChatGPT_Input_Div").value
        CHATGPT_OUTPUT_MANAGER.create_New_Message_Element().innerText = `Q. ${INPUT_MESSAGE}`

        const CONTINUE_CHAT_ELEMENT_SEL = CHATGPT_OUTPUT_MANAGER.create_New_Message_Element()
        document.querySelector("#ChatGPT_Input_Div").value = ""
        await ChatGPT_API.continue_Conversation(INPUT_MESSAGE, (output_message) => {
            CONTINUE_CHAT_ELEMENT_SEL.innerText = output_message    
        }, CONVERSATION_ID)

        document.querySelector("#ChatGPT_Input_Btn").disabled = false
    })

    let FIRST_CHAT_ELEMENT_SEL = CHATGPT_OUTPUT_MANAGER.create_New_Message_Element()
    let CURRENT_CONVERSATION_ID = await ChatGPT_API.start_Conversation(CHAT_QUERY, (output_message) => {
        FIRST_CHAT_ELEMENT_SEL.innerText = output_message 
    })
    document.querySelector("#ChatGPT_Input_Btn").setAttribute("conversation_id", CURRENT_CONVERSATION_ID)
    document.querySelector("#ChatGPT_Input_Btn").disabled = false
}

/** ChatGPT 출력창을 전체적으로 관리하기 위해서 */
class ChatGPT_Output_Manager
{
    constructor(onclick_ChatGPT_Input_Btn)
    {
        this.__make_ChatGPT_Output_Div(onclick_ChatGPT_Input_Btn)
    }

    /** Chat GPT 응답결과를 표시시킬 엘리먼트를 만들기 위해서 */
    __make_ChatGPT_Output_Div(onclick_ChatGPT_Input_Btn)
    {
        if(document.querySelector("div#main div#rcnt > div:nth-child(2)") == null)
            document.querySelector("div#main div#rcnt").innerHTML += `<div class="TQc1id rhstc4" jscontroller="cSX9Xe" data-pws="1300" data-spe="true" jsaction="rcuQ6b:npT2md" id="rhs" jsdata="MdeVKb;_;CbOYzY" role="complementary" data-hveid="CBoQAA"></div>`
        
        let DIV_HTML = `<div style="width: 93%;height: 400px;outline: auto;outline-width: thick;outline-color: lightgray;padding: 13px;">
<div style="height: 15px;font-weight: bold;">ChatGPT &gt;</div>
<div id="ChatGPT_Output_Div" style="height: 83%;margin-top: 8px;overflow-y:scroll;overflow-wrap:anywhere;"></div>
<div style="height: 35px;font-weight: bold;margin-top: 10px;">
    <textarea id="ChatGPT_Input_Div" type="textarea" style="display: block;float: left;width: 75%;"></textarea>
    <input id="ChatGPT_Input_Btn" type="button" style="float: right;width: 20%;height: 36px;" value="SEND" disabled>
</div>
</div>`
        document.querySelector("div#main div#rcnt > div:nth-child(2)").innerHTML = DIV_HTML + document.querySelector("div#main div#rcnt > div:nth-child(2)").innerHTML
        document.querySelector("#ChatGPT_Input_Btn").onclick = onclick_ChatGPT_Input_Btn
    }

    /** 새로운 메세지 요소를 결과에 추가시키기 위해서 */
    create_New_Message_Element()
    {
        const DIV_ELMENET = document.createElement("div")
        if(document.querySelector("#ChatGPT_Output_Div div"))
            DIV_ELMENET.style.marginTop = "10px"

        document.querySelector("#ChatGPT_Output_Div").appendChild(DIV_ELMENET)
        return DIV_ELMENET
    }
}

/** GPT Chat HTTP 요청에 대한 일관성을 위한 라이브러리 */
class ChatGPT_API
{
    static ROOT_DOMAIN = "https://chat.openai.com"

    /** 세션 토큰을 얻기 위해서 */
    static async get_Access_Token()
    {
        return (await Request.JSON_Request(`${ChatGPT_API.ROOT_DOMAIN}/api/auth/session`, "GET")).accessToken
    }

    /** 접근 토큰을 활용해서 JSON 요청을 하기위해서 */
    static async JSON_Request_With_Access_Token(url, method, json_body={}, extra_header_infos={})
    {
        const ACCESS_TOKEN = await ChatGPT_API.get_Access_Token()
        return (await Request.JSON_Request(url, method, json_body, {authorization: `Bearer ${ACCESS_TOKEN}`, ...extra_header_infos}))
    }
    
    /** 접근 토큰을 활용해서 JSON Event Stream 요청을 하기 위해서 */
    static async event_Stream_JSON_Request_With_Access_Token(url, method, chunk_data_callback, json_body={}, extra_header_infos={})
    {
        const ACCESS_TOKEN = await ChatGPT_API.get_Access_Token()
        return (await Request.event_Stream_JSON_Request(url, method, chunk_data_callback, json_body, {authorization: `Bearer ${ACCESS_TOKEN}`, ...extra_header_infos}))
    }

    /** 대화 ID들을 얻기 위해서 */
    static async conversation_Ids()
    {
        return (await ChatGPT_API.JSON_Request_With_Access_Token(`${ChatGPT_API.ROOT_DOMAIN}/backend-api/conversations?offset=0&limit=20`, "GET", {})).items.map((conversation_info) => conversation_info.id)
    }
    
    /** 사용 가능한 모델 슬러그들을 얻기 위해서 */
    static async model_Slugs()
    {
        return (await ChatGPT_API.JSON_Request_With_Access_Token(`${ChatGPT_API.ROOT_DOMAIN}/backend-api/models`, "GET", {})).models.map((model_info) => model_info.slug)
    }

    /** 현재 대화의 유효한 parent_message_id를 얻기 위해서 */
    static async current_Parent_Message_Id(conversation_id)
    {
        return (await ChatGPT_API.JSON_Request_With_Access_Token(`https://chat.openai.com/backend-api/conversation/${conversation_id}`, "GET", {})).current_node
    }
    
    /** 새로운 대화를 시작하기 위해서 */
    static async start_Conversation(input_message, output_message_callback)
    {
        let chunk_data_buffer = ""
        await ChatGPT_API.event_Stream_JSON_Request_With_Access_Token(`${ChatGPT_API.ROOT_DOMAIN}/backend-api/conversation`, "POST", (chunk_data) => {
            if(chunk_data.startsWith("data: [DONE]")) return
            chunk_data_buffer += chunk_data

            const MESSAGE_OBJECTS = new Array(...chunk_data_buffer.matchAll(/data: (\{"message": .* "error": null\})/g)).map((pattern) => JSON.parse(pattern[1]))
            if(MESSAGE_OBJECTS.length == 0) return

            const LAST_MESSAGE_OBJECT = MESSAGE_OBJECTS[MESSAGE_OBJECTS.length-1]
            if(LAST_MESSAGE_OBJECT.message == undefined) return
            if(LAST_MESSAGE_OBJECT.message.content == undefined) return

            const OUTPUT_MESSAGE = LAST_MESSAGE_OBJECT.message.content.parts[0]
            output_message_callback(OUTPUT_MESSAGE)

            chunk_data_buffer = ""
            const OUTPUT_DIV_SEL = document.getElementById("ChatGPT_Output_Div")
            OUTPUT_DIV_SEL.scrollTop = OUTPUT_DIV_SEL.scrollHeight
        }, {"action":"next",
            "messages":[{"id":UUID.UUIDv4(),"role":"user","content":{"content_type":"text","parts":[input_message]}}],
            "parent_message_id":UUID.UUIDv4(),
            "model":(await ChatGPT_API.model_Slugs())[0]})
        return (await ChatGPT_API.conversation_Ids())[0]
    }

    /** 이미 진행중인 대화를 이어나가기 위해서 */
    static async continue_Conversation(input_message, output_message_callback, conversation_id)
    {
        let chunk_data_buffer = ""
        await ChatGPT_API.event_Stream_JSON_Request_With_Access_Token(`${ChatGPT_API.ROOT_DOMAIN}/backend-api/conversation`, "POST", (chunk_data) => {
            if(chunk_data.startsWith("data: [DONE]")) return
            chunk_data_buffer += chunk_data

            const MESSAGE_OBJECTS = new Array(...chunk_data_buffer.matchAll(/data: (\{"message": .* "error": null\})/g)).map((pattern) => JSON.parse(pattern[1]))
            if(MESSAGE_OBJECTS.length == 0) return

            const LAST_MESSAGE_OBJECT = MESSAGE_OBJECTS[MESSAGE_OBJECTS.length-1]
            if(LAST_MESSAGE_OBJECT.message == undefined) return
            if(LAST_MESSAGE_OBJECT.message.content == undefined) return

            const OUTPUT_MESSAGE = LAST_MESSAGE_OBJECT.message.content.parts[0]
            output_message_callback(OUTPUT_MESSAGE)

            chunk_data_buffer = ""
            const OUTPUT_DIV_SEL = document.getElementById("ChatGPT_Output_Div")
            OUTPUT_DIV_SEL.scrollTop = OUTPUT_DIV_SEL.scrollHeight
        }, {"action":"next",
            "conversation_id":conversation_id,
            "messages":[{"id":UUID.UUIDv4(),"role":"user","content":{"content_type":"text","parts":[input_message]}}],
            "parent_message_id":(await ChatGPT_API.current_Parent_Message_Id(conversation_id)),
            "model":(await ChatGPT_API.model_Slugs())[0]})
    }
}

/** HTTP 요청처리를 간단하게하기 위한 라이브러리 */
class Request
{
    /** 특정 HTTP 요청 형태에 대해서 JSON Body로 요청하고, JSON 형태로 데이터를 받기 위해서 */
    static async JSON_Request(url, method, json_body={}, extra_header_infos={})
    {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({type:"json_request", url:url, method:method, json_body:json_body, extra_header_infos:extra_header_infos}, function(response) {
              resolve(response.json_data)
            })
        })
    }

    /** SSE 형태의 실시간 통신을 처리하기 위해서 */
    static async event_Stream_JSON_Request(url, method, chunk_data_callback, json_body={}, extra_header_infos={})
    {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({type:"create_event_stream_json_request", url:url, method:method, json_body:json_body, extra_header_infos:extra_header_infos}, function(response) {
              function request_Event_Stream(event_stream_key, chunk_data_callback)
                {
                chrome.runtime.sendMessage({type:"use_event_stream_json_request", event_stream_key:event_stream_key}, function(response) {
                    const STREAM_RESULT = response.stream_result
                    if(STREAM_RESULT.is_done)
                      {
                        resolve({is_done:true})
                        return
                      }
                    chunk_data_callback(STREAM_RESULT.chunk_data)
                    request_Event_Stream(event_stream_key, chunk_data_callback)
                  })
                }
              request_Event_Stream(response.event_stream_key, chunk_data_callback)
             })
        })
    }
}

/** 클라이언트 측에서 UUID를 생성시키기 위해서 */
class UUID
{
    static UUIDv4() {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
          (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }
}

// 일관된 브라우저 동작을 지원하기 위한 라이브러리
class Browser
{
  /** 지정된 키에 해당하는 URL 쿼리 문자열을 얻기 위해서 */
  static url_Query_Param(param_key)
  {
    return new URLSearchParams(location.search).get(param_key)
  }
}

main()
