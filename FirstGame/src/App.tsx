import { useState, useEffect, useCallback } from 'react'
import './App.css'

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const EMPTY_CELL = 0

const TETROMINOS = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: 'bg-cyan-500'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: 'bg-yellow-500'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: 'bg-purple-500'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: 'bg-green-500'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: 'bg-red-500'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: 'bg-blue-500'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: 'bg-orange-500'
  }
}

const TETROMINO_KEYS = Object.keys(TETROMINOS) as (keyof typeof TETROMINOS)[]

interface Position {
  x: number
  y: number
}

interface Piece {
  shape: number[][]
  color: string
  position: Position
}

const createShuffledBag = (): string[] => {
  const bag = [...TETROMINO_KEYS]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }
  return bag
}

const createPieceFromKey = (key: string): Piece => {
  const tetromino = TETROMINOS[key as keyof typeof TETROMINOS]
  return {
    shape: tetromino.shape,
    color: tetromino.color,
    position: { x: Math.floor(BOARD_WIDTH / 2) - Math.floor(tetromino.shape[0].length / 2), y: 0 }
  }
}

function App() {
  const [board, setBoard] = useState<number[][]>(() =>
    Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(EMPTY_CELL))
  )
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [pieceBag, setPieceBag] = useState<string[]>([])
  const [bagIndex, setBagIndex] = useState(0)
  const [nextPieces, setNextPieces] = useState<Piece[]>([])
  const [holdPiece, setHoldPiece] = useState<Piece | null>(null)
  const [canHold, setCanHold] = useState(true)
  const [lockDelay, setLockDelay] = useState<number | null>(null)

  const getNextPiece = useCallback((): Piece => {
    if (bagIndex >= pieceBag.length) {
      const newBag = createShuffledBag()
      setPieceBag(newBag)
      setBagIndex(1)
      return createPieceFromKey(newBag[0])
    } else {
      const pieceKey = pieceBag[bagIndex]
      setBagIndex(prev => prev + 1)
      return createPieceFromKey(pieceKey)
    }
  }, [pieceBag, bagIndex])

  const updateNextPieces = useCallback(() => {
    const pieces: Piece[] = []
    let tempBag = [...pieceBag]
    let tempIndex = bagIndex
    
    for (let i = 0; i < 2; i++) {
      if (tempIndex >= tempBag.length) {
        tempBag = createShuffledBag()
        tempIndex = 0
      }
      pieces.push(createPieceFromKey(tempBag[tempIndex]))
      tempIndex++
    }
    
    setNextPieces(pieces)
  }, [pieceBag, bagIndex])

  const rotatePieceRight = (piece: Piece): Piece => {
    const rotated = piece.shape[0].map((_, index) =>
      piece.shape.map(row => row[index]).reverse()
    )
    return { ...piece, shape: rotated }
  }

  const rotatePieceLeft = (piece: Piece): Piece => {
    const rotated = piece.shape[0].map((_, index) =>
      piece.shape.map(row => row[row.length - 1 - index])
    )
    return { ...piece, shape: rotated }
  }

  const isValidPosition = useCallback((piece: Piece, newPosition: Position): boolean => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = newPosition.x + x
          const newY = newPosition.y + y
          
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return false
          }
          
          if (newY >= 0 && board[newY][newX] !== EMPTY_CELL) {
            return false
          }
        }
      }
    }
    return true
  }, [board])

  const placePiece = useCallback((piece: Piece): number[][] => {
    const newBoard = board.map(row => [...row])
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = piece.position.y + y
          const boardX = piece.position.x + x
          if (boardY >= 0) {
            newBoard[boardY][boardX] = 1
          }
        }
      }
    }
    
    return newBoard
  }, [board])

  const clearLines = useCallback((board: number[][]): { newBoard: number[][], linesCleared: number } => {
    const fullLines: number[] = []
    
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      if (board[y].every(cell => cell !== EMPTY_CELL)) {
        fullLines.push(y)
      }
    }
    
    if (fullLines.length === 0) {
      return { newBoard: board, linesCleared: 0 }
    }
    
    const newBoard = board.filter((_, index) => !fullLines.includes(index))
    
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(EMPTY_CELL))
    }
    
    return { newBoard, linesCleared: fullLines.length }
  }, [])

  const movePiece = useCallback((direction: 'left' | 'right' | 'down'): boolean => {
    if (!currentPiece || gameOver || isPaused) return false
    
    const newPosition = { ...currentPiece.position }
    
    switch (direction) {
      case 'left':
        newPosition.x -= 1
        break
      case 'right':
        newPosition.x += 1
        break
      case 'down':
        newPosition.y += 1
        break
    }
    
    if (isValidPosition(currentPiece, newPosition)) {
      setCurrentPiece({ ...currentPiece, position: newPosition })
      if (direction === 'down') {
        setLockDelay(null)
      }
      return true
    }
    
    if (direction === 'down') {
      if (lockDelay === null) {
        setLockDelay(Date.now() + 500)
        return false
      } else if (Date.now() < lockDelay) {
        return false
      } else {
        const newBoard = placePiece(currentPiece)
        const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard)
        
        setBoard(clearedBoard)
        setLines(prev => prev + linesCleared)
        setScore(prev => prev + linesCleared * 100 + 10)
        setLockDelay(null)
        setCanHold(true)
        
        const nextPiece = getNextPiece()
        if (!isValidPosition(nextPiece, nextPiece.position)) {
          setGameOver(true)
        } else {
          setCurrentPiece(nextPiece)
        }
        
        return false
      }
    }
    
    return false
  }, [currentPiece, gameOver, isPaused, isValidPosition, placePiece, clearLines, getNextPiece, lockDelay])

  const holdPieceHandler = useCallback(() => {
    if (!currentPiece || gameOver || isPaused || !canHold) return
    
    if (holdPiece) {
      const tempPiece = { ...holdPiece, position: { x: Math.floor(BOARD_WIDTH / 2) - Math.floor(holdPiece.shape[0].length / 2), y: 0 } }
      setHoldPiece({ ...currentPiece, position: { x: 0, y: 0 } })
      setCurrentPiece(tempPiece)
    } else {
      setHoldPiece({ ...currentPiece, position: { x: 0, y: 0 } })
      setCurrentPiece(getNextPiece())
    }
    setCanHold(false)
  }, [currentPiece, holdPiece, gameOver, isPaused, canHold, getNextPiece])

  const quickDrop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return
    
    let newY = currentPiece.position.y
    while (isValidPosition(currentPiece, { ...currentPiece.position, y: newY + 1 })) {
      newY += 1
    }
    
    const droppedPiece = { ...currentPiece, position: { ...currentPiece.position, y: newY } }
    const newBoard = placePiece(droppedPiece)
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard)
    
    setBoard(clearedBoard)
    setLines(prev => prev + linesCleared)
    setScore(prev => prev + linesCleared * 100 + (newY - currentPiece.position.y) * 2)
    setLockDelay(null)
    setCanHold(true)
    
    const nextPiece = getNextPiece()
    if (!isValidPosition(nextPiece, nextPiece.position)) {
      setGameOver(true)
    } else {
      setCurrentPiece(nextPiece)
    }
  }, [currentPiece, gameOver, isPaused, isValidPosition, placePiece, clearLines, getNextPiece])

  const rotatePieceRightHandler = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return
    
    const rotated = rotatePieceRight(currentPiece)
    if (isValidPosition(rotated, rotated.position)) {
      setCurrentPiece(rotated)
    }
  }, [currentPiece, gameOver, isPaused, isValidPosition])

  const rotatePieceLeftHandler = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return
    
    const rotated = rotatePieceLeft(currentPiece)
    if (isValidPosition(rotated, rotated.position)) {
      setCurrentPiece(rotated)
    }
  }, [currentPiece, gameOver, isPaused, isValidPosition])

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        movePiece('left')
        break
      case 'ArrowRight':
        event.preventDefault()
        movePiece('right')
        break
      case 'ArrowDown':
        event.preventDefault()
        movePiece('down')
        break
      case 'ArrowUp':
        event.preventDefault()
        quickDrop()
        break
      case ' ':
        event.preventDefault()
        holdPieceHandler()
        break
      case 'w':
      case 'W':
        event.preventDefault()
        quickDrop()
        break
      case 'a':
      case 'A':
        event.preventDefault()
        movePiece('left')
        break
      case 's':
      case 'S':
        event.preventDefault()
        movePiece('down')
        break
      case 'd':
      case 'D':
        event.preventDefault()
        movePiece('right')
        break
      case 'j':
      case 'J':
        event.preventDefault()
        rotatePieceLeftHandler()
        break
      case 'k':
      case 'K':
        event.preventDefault()
        rotatePieceRightHandler()
        break
      case 'p':
      case 'P':
        event.preventDefault()
        setIsPaused(prev => !prev)
        break
    }
  }, [movePiece, quickDrop, holdPieceHandler, rotatePieceRightHandler, rotatePieceLeftHandler])

  const resetGame = () => {
    const initialBag = createShuffledBag()
    setPieceBag(initialBag)
    setBagIndex(1)
    setBoard(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(EMPTY_CELL)))
    setCurrentPiece(createPieceFromKey(initialBag[0]))
    setScore(0)
    setLines(0)
    setGameOver(false)
    setIsPaused(false)
    setHoldPiece(null)
    setCanHold(true)
    setLockDelay(null)
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  useEffect(() => {
    if (!currentPiece && !gameOver) {
      const initialBag = createShuffledBag()
      setPieceBag(initialBag)
      setBagIndex(1)
      setCurrentPiece(createPieceFromKey(initialBag[0]))
    }
  }, [currentPiece, gameOver])

  useEffect(() => {
    updateNextPieces()
  }, [updateNextPieces])

  useEffect(() => {
    if (gameOver || isPaused || !currentPiece) return
    
    const interval = setInterval(() => {
      movePiece('down')
    }, Math.max(100, 1000 - lines * 50))
    
    return () => clearInterval(interval)
  }, [movePiece, lines, gameOver, isPaused, currentPiece])

  const renderPiece = (piece: Piece | null, size: number = 4) => {
    if (!piece) return <div className={`w-${size * 6} h-${size * 6} bg-gray-800 border border-gray-600`} />
    
    const grid = Array(size).fill(null).map(() => Array(size).fill(0))
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          grid[y][x] = 1
        }
      }
    }
    
    return (
      <div className="flex flex-col">
        {grid.map((row, y) => (
          <div key={y} className="flex">
            {row.map((cell, x) => (
              <div
                key={x}
                className={`w-6 h-6 border border-gray-400 ${
                  cell ? piece.color : 'bg-gray-900'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  const renderBoard = () => {
    const displayBoard = board.map(row => [...row])
    
    if (currentPiece) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = currentPiece.position.y + y
            const boardX = currentPiece.position.x + x
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = 2
            }
          }
        }
      }
    }
    
    return displayBoard.map((row, y) => (
      <div key={y} className="flex">
        {row.map((cell, x) => (
          <div
            key={x}
            className={`w-6 h-6 border border-gray-400 ${
              cell === 0 ? 'bg-gray-900' : 
              cell === 1 ? 'bg-gray-300' : 
              currentPiece?.color || 'bg-white'
            }`}
          />
        ))}
      </div>
    ))
  }

  return (
    <div className="min-h-screen bg-gray-800 text-white flex items-center justify-center p-4">
      <div className="flex gap-8">
        <div className="flex flex-col gap-4">
          <div className="bg-gray-700 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">HOLD</h2>
            {renderPiece(holdPiece)}
          </div>
          <div className="bg-gray-700 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">NEXT</h2>
            {nextPieces.slice(0, 2).map((piece, index) => (
              <div key={index} className="mb-2">
                {renderPiece(piece)}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-bold mb-4">テトリス</h1>
          <div className="border-2 border-gray-600 bg-gray-900 p-2">
            {renderBoard()}
          </div>
          {gameOver && (
            <div className="mt-4 text-center">
              <p className="text-xl text-red-500 mb-2">ゲームオーバー</p>
              <button
                onClick={resetGame}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                リスタート
              </button>
            </div>
          )}
          {isPaused && !gameOver && (
            <p className="mt-4 text-xl text-yellow-500">一時停止中</p>
          )}
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="bg-gray-700 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">スコア</h2>
            <p className="text-2xl">{score}</p>
          </div>
          
          <div className="bg-gray-700 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">ライン</h2>
            <p className="text-2xl">{lines}</p>
          </div>
          
          <div className="bg-gray-700 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">操作方法</h2>
            <div className="text-sm space-y-1">
              <p>← → / A D : 移動</p>
              <p>↓ / S : 下降</p>
              <p>↑ / W : ハードドロップ</p>
              <p>スペース : HOLD</p>
              <p>J : 左回転</p>
              <p>K : 右回転</p>
              <p>P : 一時停止</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
