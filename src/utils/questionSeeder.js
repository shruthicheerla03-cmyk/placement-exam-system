/**
 * Questions Seeder for React Admin Dashboard
 * Import this in AdminDashboard to seed questions directly from UI
 */

import { db } from '../firebase/config';
import { collection, getDocs, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';

// Question data - 99 real placement exam questions
const questionsData = [
  // ==================== ROUND 1: APTITUDE ====================
  
  // -------- EASY (10 questions) --------
  {
    text: "What is 25% of 200?",
    options: ["25", "50", "75", "100"],
    correct: "50",
    difficulty: "Easy",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "If a train travels 60 km in 1 hour, how far will it travel in 2 hours?",
    options: ["100 km", "110 km", "120 km", "130 km"],
    correct: "120 km",
    difficulty: "Easy",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "Find 10% of 500",
    options: ["10", "50", "100", "5"],
    correct: "50",
    difficulty: "Easy",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "The sum of 45 and 37 is:",
    options: ["72", "82", "92", "102"],
    correct: "82",
    difficulty: "Easy",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "If the cost price is Rs.100 and selling price is Rs.120, what is the profit?",
    options: ["Rs.10", "Rs.20", "Rs.30", "Rs.40"],
    correct: "Rs.20",
    difficulty: "Easy",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "A number increased by 20% becomes 60. What is the original number?",
    options: ["40", "45", "50", "55"],
    correct: "50",
    difficulty: "Easy",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "The average of 10, 20, and 30 is:",
    options: ["15", "20", "25", "30"],
    correct: "20",
    difficulty: "Easy",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "If 5 pens cost Rs.50, what is the cost of 8 pens?",
    options: ["Rs.70", "Rs.75", "Rs.80", "Rs.85"],
    correct: "Rs.80",
    difficulty: "Easy",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "What is the next number in the series: 2, 4, 6, 8, __?",
    options: ["9", "10", "11", "12"],
    correct: "10",
    difficulty: "Easy",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "If Speed = 50 km/hr and Time = 3 hours, what is Distance?",
    options: ["100 km", "125 km", "150 km", "175 km"],
    correct: "150 km",
    difficulty: "Easy",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },

  // -------- MEDIUM (5 questions) --------
  {
    text: "A shopkeeper sells an item for Rs.540 after giving a 10% discount. What was the original price?",
    options: ["Rs.600", "Rs.590", "Rs.650", "Rs.620"],
    correct: "Rs.600",
    difficulty: "Medium",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "Two numbers are in the ratio 3:5 and their sum is 80. Find the larger number.",
    options: ["50", "40", "60", "30"],
    correct: "50",
    difficulty: "Medium",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "A man buys an article for Rs.800 and sells it at a profit of 15%. What is the selling price?",
    options: ["Rs.900", "Rs.920", "Rs.950", "Rs.880"],
    correct: "Rs.920",
    difficulty: "Medium",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "If the compound interest on Rs.1000 for 2 years at 10% per annum is compounded annually, what is the total amount?",
    options: ["Rs.1200", "Rs.1210", "Rs.1100", "Rs.1250"],
    correct: "Rs.1210",
    difficulty: "Medium",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "A car covers a distance of 240 km in 4 hours. What is its average speed in km/hr?",
    options: ["50", "55", "60", "65"],
    correct: "60",
    difficulty: "Medium",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },

  // -------- HARD (5 questions) --------
  {
    text: "Two pipes can fill a tank in 12 and 18 hours respectively. If both pipes are opened together, in how many hours will the tank be filled?",
    options: ["7.2 hours", "6 hours", "8 hours", "5 hours"],
    correct: "7.2 hours",
    difficulty: "Hard",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "A person invests Rs.5000 at 8% per annum compound interest. What will be the amount after 2 years?",
    options: ["Rs.5832", "Rs.5800", "Rs.5900", "Rs.6000"],
    correct: "Rs.5832",
    difficulty: "Hard",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "A boat can travel 30 km downstream in 2 hours and 20 km upstream in 2 hours. What is the speed of the stream?",
    options: ["2.5 km/hr", "3 km/hr", "3.5 km/hr", "4 km/hr"],
    correct: "2.5 km/hr",
    difficulty: "Hard",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "If A can complete a work in 10 days and B can complete it in 15 days, how many days will they take working together?",
    options: ["5 days", "6 days", "7 days", "8 days"],
    correct: "6 days",
    difficulty: "Hard",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },
  {
    text: "The ages of A and B are in the ratio 5:7. After 10 years, the ratio will be 7:9. What is A's present age?",
    options: ["20 years", "25 years", "30 years", "35 years"],
    correct: "25 years",
    difficulty: "Hard",
    category: "Aptitude",
    subject: "aptitude",
    round: "round1"
  },

  // ==================== ROUND 2: CORE SUBJECTS ====================
  
  // -------- OS (Operating Systems) --------
  // Easy (8 questions)
  {
    text: "What does OS stand for?",
    options: ["Open Software", "Operating System", "Output System", "Online Service"],
    correct: "Operating System",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "Which of the following is an operating system?",
    options: ["MS Word", "Linux", "Google Chrome", "MySQL"],
    correct: "Linux",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "What is the main function of an operating system?",
    options: ["Process management", "Virus scanning", "Graphics rendering", "Network routing"],
    correct: "Process management",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "What is a process in OS?",
    options: ["A running program", "A file", "A folder", "A virus"],
    correct: "A running program",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "Which memory is fastest?",
    options: ["Hard Disk", "RAM", "Cache", "ROM"],
    correct: "Cache",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "What is virtual memory?",
    options: ["RAM only", "Hard disk space used as RAM", "ROM", "Cache memory"],
    correct: "Hard disk space used as RAM",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "What does CPU stand for?",
    options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Unit", "Computer Processing Utility"],
    correct: "Central Processing Unit",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "Which scheduling algorithm is non-preemptive?",
    options: ["Round Robin", "FCFS", "Priority with preemption", "Shortest Remaining Time First"],
    correct: "FCFS",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },

  // Medium (8 questions)
  {
    text: "Which scheduling algorithm is preemptive?",
    options: ["FCFS", "SJF (Non-preemptive)", "Round Robin", "None"],
    correct: "Round Robin",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "What is thrashing in OS?",
    options: ["High CPU usage", "Excessive paging activity", "Memory leak", "Disk failure"],
    correct: "Excessive paging activity",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "What is a semaphore?",
    options: ["A file type", "A synchronization tool", "A memory type", "A process state"],
    correct: "A synchronization tool",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "Which page replacement algorithm has the lowest page fault rate?",
    options: ["FIFO", "LRU", "Optimal", "Random"],
    correct: "Optimal",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "What is a context switch?",
    options: ["Switching between user and kernel mode", "Switching between processes", "Switching memory pages", "Switching CPU cores"],
    correct: "Switching between processes",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "What is the purpose of spooling?",
    options: ["Memory management", "Handle slow I/O devices", "Process scheduling", "File compression"],
    correct: "Handle slow I/O devices",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "Which memory allocation technique causes external fragmentation?",
    options: ["Paging", "Segmentation", "Both", "Neither"],
    correct: "Segmentation",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "What is the main advantage of multithreading?",
    options: ["Less memory usage", "Better resource utilization", "Faster disk access", "Improved security"],
    correct: "Better resource utilization",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },

  // Hard (8 questions)
  {
    text: "Deadlock requires which conditions to occur?",
    options: ["Mutual exclusion only", "Hold and wait only", "No preemption only", "All of these"],
    correct: "All of these",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "Which deadlock handling technique is used by most operating systems?",
    options: ["Prevention", "Avoidance", "Detection & Recovery", "Ignorance (Ostrich algorithm)"],
    correct: "Ignorance (Ostrich algorithm)",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "What is the Banker's Algorithm used for?",
    options: ["CPU scheduling", "Deadlock avoidance", "Memory allocation", "Disk scheduling"],
    correct: "Deadlock avoidance",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "In demand paging, what happens when a page fault occurs?",
    options: ["Program terminates", "Page is loaded from disk to memory", "CPU halts", "Cache is cleared"],
    correct: "Page is loaded from disk to memory",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "What is the difference between a process and a thread?",
    options: ["No difference", "Threads share memory, processes don't", "Processes are faster", "Threads can't communicate"],
    correct: "Threads share memory, processes don't",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "Which file allocation method is best for sequential access?",
    options: ["Contiguous", "Linked", "Indexed", "All are equal"],
    correct: "Contiguous",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "What is belady's anomaly?",
    options: ["More frames lead to more page faults", "Less CPU leads to better performance", "Deadlock with 2 processes", "Cache miss rate"],
    correct: "More frames lead to more page faults",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },
  {
    text: "In which process state can a process not execute?",
    options: ["Running", "Ready", "Waiting", "Terminated"],
    correct: "Waiting",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "os",
    round: "round2"
  },

  // -------- CN (Computer Networks) --------
  // Easy (8 questions)
  {
    text: "Which layer handles routing in the OSI model?",
    options: ["Transport", "Network", "Data Link", "Session"],
    correct: "Network",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "What does IP stand for?",
    options: ["Internet Protocol", "Internal Protocol", "Internet Process", "Internal Process"],
    correct: "Internet Protocol",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "Which device operates at the Network layer?",
    options: ["Switch", "Router", "Hub", "Bridge"],
    correct: "Router",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "What is the full form of HTTP?",
    options: ["HyperText Transfer Protocol", "HyperText Transmission Protocol", "HighText Transfer Protocol", "HighText Transmission Protocol"],
    correct: "HyperText Transfer Protocol",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "Which topology connects all devices to a central hub?",
    options: ["Ring", "Star", "Mesh", "Bus"],
    correct: "Star",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "What is the standard port number for HTTP?",
    options: ["21", "25", "80", "443"],
    correct: "80",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "Which protocol is used for email sending?",
    options: ["POP3", "SMTP", "FTP", "HTTP"],
    correct: "SMTP",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "What does DNS stand for?",
    options: ["Domain Name System", "Data Network Service", "Domain Network System", "Data Name Service"],
    correct: "Domain Name System",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },

  // Medium (8 questions)
  {
    text: "What is TCP known for?",
    options: ["Connectionless", "Reliable connection-oriented", "Stateless", "Fast but unreliable"],
    correct: "Reliable connection-oriented",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "Which protocol uses a 3-way handshake?",
    options: ["UDP", "TCP", "ICMP", "ARP"],
    correct: "TCP",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "What is the subnet mask for a Class C network?",
    options: ["255.0.0.0", "255.255.0.0", "255.255.255.0", "255.255.255.255"],
    correct: "255.255.255.0",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "Which protocol is used to resolve IP addresses to MAC addresses?",
    options: ["DNS", "RARP", "ARP", "DHCP"],
    correct: "ARP",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "What is the maximum size of a TCP packet?",
    options: ["64 KB", "128 KB", "256 KB", "512 KB"],
    correct: "64 KB",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "Which layer is responsible for error detection and correction?",
    options: ["Physical", "Data Link", "Network", "Transport"],
    correct: "Data Link",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "What is the purpose of a firewall?",
    options: ["Speed up network", "Block viruses only", "Filter network traffic", "Store data"],
    correct: "Filter network traffic",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "Which protocol is connectionless?",
    options: ["TCP", "FTP", "UDP", "SMTP"],
    correct: "UDP",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },

  // Hard (8 questions)
  {
    text: "What is the difference between TCP and UDP?",
    options: ["TCP is faster", "UDP is reliable", "TCP is connection-oriented, UDP is not", "No difference"],
    correct: "TCP is connection-oriented, UDP is not",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "What is the purpose of the sliding window protocol?",
    options: ["Encryption", "Flow control", "Routing", "Error detection"],
    correct: "Flow control",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "Which routing algorithm is used by OSPF?",
    options: ["Distance Vector", "Link State", "Path Vector", "Static Routing"],
    correct: "Link State",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "What is CSMA/CD used for?",
    options: ["Wireless networks", "Ethernet collision detection", "IP addressing", "Encryption"],
    correct: "Ethernet collision detection",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "In IPv4, how many bits are in an IP address?",
    options: ["16", "32", "64", "128"],
    correct: "32",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "What is the main advantage of IPv6 over IPv4?",
    options: ["Faster speed", "Larger address space", "Better encryption", "Lower cost"],
    correct: "Larger address space",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "What does NAT stand for?",
    options: ["Network Address Translation", "Network Access Token", "New Address Type", "Network Authentication Token"],
    correct: "Network Address Translation",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },
  {
    text: "Which layer of OSI model handles encryption?",
    options: ["Application", "Presentation", "Session", "Transport"],
    correct: "Presentation",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "cn",
    round: "round2"
  },

  // -------- COA (Computer Organization & Architecture) --------
  // Easy (8 questions)
  {
    text: "What does CPU stand for?",
    options: ["Central Processing Unit", "Control Processing Unit", "Computer Power Unit", "Central Power Unit"],
    correct: "Central Processing Unit",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "Which component stores data permanently?",
    options: ["RAM", "Cache", "Hard Disk", "Register"],
    correct: "Hard Disk",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "What is the basic unit of memory?",
    options: ["Bit", "Byte", "Word", "Nibble"],
    correct: "Bit",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "How many bits are in a byte?",
    options: ["4", "8", "16", "32"],
    correct: "8",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "Which is the fastest memory?",
    options: ["Hard Disk", "RAM", "Cache", "Register"],
    correct: "Register",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "What does ALU stand for?",
    options: ["Arithmetic Logic Unit", "Advanced Logic Unit", "Automatic Logic Unit", "Arithmetic Linear Unit"],
    correct: "Arithmetic Logic Unit",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "Which memory is volatile?",
    options: ["ROM", "Hard Disk", "RAM", "Flash Drive"],
    correct: "RAM",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "What is the function of the Control Unit?",
    options: ["Perform calculations", "Store data", "Control operations", "Display output"],
    correct: "Control operations",
    difficulty: "Easy",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },

  // Medium (8 questions)
  {
    text: "Cache memory is:",
    options: ["Slow and cheap", "Expensive and fast", "Volatile and permanent", "Software-based"],
    correct: "Expensive and fast",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "What is pipelining in CPU?",
    options: ["Multiple instructions executed in parallel stages", "Memory management", "I/O operation", "Error correction"],
    correct: "Multiple instructions executed in parallel stages",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "Which addressing mode uses a constant value?",
    options: ["Direct", "Immediate", "Indirect", "Indexed"],
    correct: "Immediate",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "What is the purpose of an instruction register?",
    options: ["Store data", "Hold current instruction", "Perform ALU operations", "Control memory"],
    correct: "Hold current instruction",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "What is RISC?",
    options: ["Reduced Instruction Set Computer", "Random Instruction Set Computer", "Real Instruction Set Computer", "Rapid Instruction Set Computer"],
    correct: "Reduced Instruction Set Computer",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "What is virtual memory?",
    options: ["Physical RAM", "Simulated memory using hard disk", "Cache memory", "ROM"],
    correct: "Simulated memory using hard disk",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "What is the main advantage of cache memory?",
    options: ["Large storage", "Low cost", "Fast access time", "Permanent storage"],
    correct: "Fast access time",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "What is DMA?",
    options: ["Direct Memory Access", "Data Memory Address", "Dynamic Memory Allocation", "Dual Memory Access"],
    correct: "Direct Memory Access",
    difficulty: "Medium",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },

  // Hard (6 questions)
  {
    text: "What is the main difference between RISC and CISC?",
    options: ["RISC has complex instructions", "CISC has fewer instructions", "RISC has simple instructions, CISC has complex", "No difference"],
    correct: "RISC has simple instructions, CISC has complex",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "What causes a cache miss?",
    options: ["Data found in cache", "Data not found in cache", "CPU error", "Memory overflow"],
    correct: "Data not found in cache",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "What is the von Neumann architecture?",
    options: ["Separate instruction and data memory", "Shared memory for instructions and data", "Only for data storage", "Only for instructions"],
    correct: "Shared memory for instructions and data",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "What is instruction pipelining hazard?",
    options: ["Improved performance", "Data dependency causing delay", "Faster execution", "Memory issue"],
    correct: "Data dependency causing delay",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "What is the purpose of program counter (PC)?",
    options: ["Count programs", "Hold next instruction address", "Perform calculations", "Store data"],
    correct: "Hold next instruction address",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },
  {
    text: "What is memory interleaving?",
    options: ["Dividing memory into modules for parallel access", "Combining cache and RAM", "Error correction", "Virtual memory technique"],
    correct: "Dividing memory into modules for parallel access",
    difficulty: "Hard",
    category: "Core Subjects",
    subject: "coa",
    round: "round2"
  },

  // ==================== ROUND 3: DSA ====================
  
  // -------- EASY (3 questions) --------
  {
    text: "What is the time complexity of linear search?",
    options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
    correct: "O(n)",
    difficulty: "Easy",
    category: "DSA",
    subject: "dsa",
    round: "round3"
  },
  {
    text: "Which data structure uses LIFO (Last In First Out)?",
    options: ["Queue", "Stack", "Array", "Tree"],
    correct: "Stack",
    difficulty: "Easy",
    category: "DSA",
    subject: "dsa",
    round: "round3"
  },
  {
    text: "What is the time complexity of accessing an element in an array by index?",
    options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
    correct: "O(1)",
    difficulty: "Easy",
    category: "DSA",
    subject: "dsa",
    round: "round3"
  },

  // -------- MEDIUM (4 questions) --------
  {
    text: "What is the time complexity of merge sort?",
    options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"],
    correct: "O(n log n)",
    difficulty: "Medium",
    category: "DSA",
    subject: "dsa",
    round: "round3"
  },
  {
    text: "What is the time complexity of binary search?",
    options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
    correct: "O(log n)",
    difficulty: "Medium",
    category: "DSA",
    subject: "dsa",
    round: "round3"
  },
  {
    text: "Which traversal of a binary tree visits nodes in ascending order in a BST?",
    options: ["Preorder", "Inorder", "Postorder", "Level order"],
    correct: "Inorder",
    difficulty: "Medium",
    category: "DSA",
    subject: "dsa",
    round: "round3"
  },
  {
    text: "What is the worst-case time complexity of quicksort?",
    options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"],
    correct: "O(n^2)",
    difficulty: "Medium",
    category: "DSA",
    subject: "dsa",
    round: "round3"
  },

  // -------- HARD (2 questions) --------
  {
    text: "Which problem is NP-Complete?",
    options: ["Sorting", "Travelling Salesman Problem", "Binary Search", "Hashing"],
    correct: "Travelling Salesman Problem",
    difficulty: "Hard",
    category: "DSA",
    subject: "dsa",
    round: "round3"
  },
  {
    text: "What is the space complexity of recursive fibonacci implementation?",
    options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
    correct: "O(n)",
    difficulty: "Hard",
    category: "DSA",
    subject: "dsa",
    round: "round3"
  }
];

export const deleteAllQuestions = async () => {
  console.log('🗑️  Deleting existing questions...');
  
  try {
    const snapshot = await getDocs(collection(db, 'questions'));
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`✅ Deleted ${snapshot.docs.length} questions`);
    return { success: true, count: snapshot.docs.length };
  } catch (error) {
    console.error('❌ Error deleting questions:', error);
    throw error;
  }
};

export const seedQuestionsData = async () => {
  console.log('🌱 Seeding questions...');
  
  try {
    const insertPromises = questionsData.map(question => 
      addDoc(collection(db, 'questions'), {
        ...question,
        createdAt: serverTimestamp()
      })
    );
    
    await Promise.all(insertPromises);
    
    console.log('✅ Seeded all questions successfully!');
    return { success: true, count: questionsData.length };
  } catch (error) {
    console.error('❌ Error seeding questions:', error);
    throw error;
  }
};

export const resetAndSeedQuestions = async () => {
  try {
    await deleteAllQuestions();
    const result = await seedQuestionsData();
    return result;
  } catch (error) {
    throw error;
  }
};
