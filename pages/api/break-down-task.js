export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { task } = req.body;

  if (!task) {
    return res.status(400).json({ message: 'Task is required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `다음 할일이 실제로 수행 가능한 구체적인 작업인지 먼저 판단하고, 가능하다면 ADHD가 있는 사람이 수행하기 쉽도록 작고 구체적인 단계들로 나누어 주세요.

할일: "${task}"

판단 기준:
- 의미 있는 실제 작업인가? (예: 방청소, 보고서작성 ✅ / ㅁㄴㅇㄹ, zzz, 테스트 ❌)
- 구체적으로 실행 가능한가?
- 여러 단계로 나눌 수 있는가?

응답은 다음 JSON 형식으로만 해주세요:

분할 가능한 경우:
{
  "valid": true,
  "subtasks": [
    {
      "title": "구체적인 작업 제목",
      "description": "간단한 설명",
      "estimatedTime": "예상 소요시간"
    }
  ]
}

분할 불가능한 경우:
{
  "valid": false,
  "reason": "거부 이유 (예: 의미 없는 입력, 구체적이지 않음 등)"
}

JSON 외에는 아무것도 출력하지 마세요.`
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API 요청 실패: ${response.status}`);
    }

    const data = await response.json();
    let responseText = data.content[0].text;
    
    // JSON 코드 블록 제거
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const result = JSON.parse(responseText);
    
    // 유효성 검사
    if (!result.valid) {
      return res.status(400).json({ 
        error: true,
        message: result.reason || '분할할 수 없는 작업입니다',
        suggestion: '더 구체적이고 실행 가능한 작업을 입력해주세요'
      });
    }

    // 분할 가능한 경우 결과 검증
    if (!result.subtasks || !Array.isArray(result.subtasks)) {
      throw new Error('Invalid response format');
    }

    res.status(200).json({ subtasks: result.subtasks });
    
  } catch (error) {
    console.error('API 에러:', error);
    
    // 에러 시 기본 분할 제공
    const fallbackSubtasks = [
      {
        title: `${task} - 준비하기`,
        description: "필요한 자료와 도구를 준비합니다",
        estimatedTime: "10분"
      },
      {
        title: `${task} - 실행하기`,
        description: "실제 작업을 수행합니다",
        estimatedTime: "20분"
      },
      {
        title: `${task} - 마무리하기`,
        description: "작업을 검토하고 정리합니다",
        estimatedTime: "10분"
      }
    ];

    res.status(200).json({ 
      subtasks: fallbackSubtasks,
      fallback: true 
    });
  }
}