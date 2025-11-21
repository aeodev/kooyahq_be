const API_URL = 'http://localhost:5001/api'
let token: string
let boardId: string
let sprintId: string
let cardId: string

async function request(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const headers: any = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const config: RequestInit = { method, headers }
    if (body) config.body = JSON.stringify(body)

    const res = await fetch(`${API_URL}${endpoint}`, config)
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(JSON.stringify(error))
    }
    const json: any = await res.json()
    return json.data || json
}

async function runVerification() {
    try {
        console.log('Starting Sprint Lifecycle Verification...')

        // 0. Authenticate
        console.log('\n0. Authenticating...')
        const email = `test${Date.now()}@example.com`
        const password = 'password123'
        const name = 'Test User'

        await request('/auth/register', 'POST', { email, password, name })
        const loginRes = await request('/auth/login', 'POST', { email, password })
        token = loginRes.token
        const userId = loginRes.user.id
        console.log('✅ Authenticated as:', email)

        // 1. Create Board
        console.log('\n1. Creating Sprint Board...')
        const board = await request('/boards', 'POST', {
            name: 'Verification Board',
            type: 'sprint',
            ownerId: userId
        })
        console.log('Board Response:', JSON.stringify(board, null, 2))
        boardId = board.id
        console.log('✅ Board created:', boardId)

        // 2. Create Sprint
        console.log('\n2. Creating Sprint...')
        const boardWithSprint = await request(`/boards/${boardId}/sprints`, 'POST', {
            name: 'Sprint 1',
            goal: 'Verify backend'
        })
        const sprint = boardWithSprint.sprints[boardWithSprint.sprints.length - 1]
        sprintId = sprint.id
        console.log('✅ Sprint created:', sprintId)

        // 3. Create Card in Backlog
        console.log('\n3. Creating Card in Backlog...')
        const card = await request('/cards', 'POST', {
            title: 'Test Card',
            boardId,
            columnId: 'Backlog',
            issueType: 'task',
            priority: 'medium'
        })
        cardId = card.id
        console.log('✅ Card created:', cardId)

        // 4. Move Card to Sprint
        console.log('\n4. Moving Card to Sprint...')
        await request(`/cards/${cardId}`, 'PUT', {
            sprintId: sprintId
        })
        console.log('✅ Card moved to sprint')

        // 5. Start Sprint
        console.log('\n5. Starting Sprint...')
        const startDate = new Date()
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 14)

        await request(`/boards/${boardId}/sprints/${sprintId}`, 'PUT', {
            state: 'active',
            startDate,
            endDate
        })
        console.log('✅ Sprint started')

        // 6. Complete Sprint
        console.log('\n6. Completing Sprint...')
        await request(`/boards/${boardId}/sprints/${sprintId}`, 'PUT', {
            state: 'closed',
            endDate: new Date()
        })
        console.log('✅ Sprint completed')

        console.log('\n🎉 Verification Successful!')

        // Cleanup
        await request(`/boards/${boardId}`, 'DELETE')
        console.log('\nCleanup: Board deleted')

    } catch (error: any) {
        console.error('\n❌ Verification Failed:', error.message)
        process.exit(1)
    }
}

runVerification()
