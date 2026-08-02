export type Language = 'zh-CN' | 'en-US';

type TranslationNode = {
  [key: string]: string | TranslationNode;
};

const interpolate = (
  template: string,
  params?: Record<string, string | number>
): string => {
  if (!params) return template;

  return Object.entries(params).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    template
  );
};

export const messages: Record<Language, TranslationNode> = {
  'zh-CN': {
    common: {
      appName: '交小才',
      switchLanguage: 'EN',
      switchLanguageLabel: '切换到英文',
      usernameFallback: '账号1',
      loadingDetecting: '检测中',
      connected: '已连接',
      disconnected: '未连接',
      save: '保存',
      cancel: '取消',
      add: '添加',
      close: '关闭',
      download: '下载',
      edit: '编辑',
      delete: '删除',
      back: '返回',
      send: '发送'
    },
    login: {
      title: '用户登录',
      username: '用户名',
      password: '密码',
      submit: '登录',
      invalidCredentials: '用户名或密码错误',
      showPassword: '显示密码',
      hidePassword: '隐藏密码'
    },
    topNav: {
      tangshanLogs: '唐山数字人聊天日志',
      beijingLogs: '北京数字人聊天日志',
      details: '数字人详情',
      logoAlt: '交小才'
    },
    account: {
      accountManagement: '账户管理',
      settings: '设置',
      logout: '退出',
      accountManagementTodo: '账户管理功能待实现',
      settingsTodo: '设置功能待实现'
    },
    sidebar: {
      title: '设备列表',
      addDevice: '添加设备',
      editDevice: '编辑设备',
      addDeviceDialog: '添加设备',
      deviceName: '设备名称',
      type: '类型',
      linkType: '网页/链接',
      downloadType: '桌面监控(需下载)',
      link: '链接',
      linkRequired: '链接类型必填',
      linkOptional: '可选，留空则使用默认下载页',
      remoteTitle: '使用向日葵客户端远控',
      remoteDesc1: '向日葵客户端如果未安装，请先下载安装。',
      remoteDesc2: '安装完成后直接使用向日葵客户端远控。',
      siteMonitor: '场地监控',
      desktopMonitor: '桌面监控(向日葵)',
      missingLink: '未配置链接',
      confirmDelete: '确认删除设备？',
      enterDeviceName: '请输入设备名称',
      enterDeviceLink: '请输入设备链接'
    },
    chatLogs: {
      title: 'Tailscale 连接',
      intro: '先确认 Tailscale 网络连通，再在下方动态连接两台 Linux 服务器。',
      tangshan: '唐山数字人',
      beijing: '北京数字人',
      fetchFailed: '无法获取 Tailscale 状态',
      statusLine: '{label}：{status}'
    },
    chatbot: {
      initialMessage: '您好，我是交小才，请输入您的问题',
      emptyReply: '请求成功，但未返回可展示的内容。',
      fixedIntroReply:
        '我的名字是交小才。我是由联想集团和北京交通大学联合开发研制的数字人，专门负责根据知识库来回答提问者的各种问题。欢迎您随时提问！',
      timeout: '请求超时：{apiUrl}',
      mixedContent:
        '浏览器拦截了不安全请求：当前页面是 HTTPS，但聊天接口是 HTTP（{apiUrl}）',
      connectFailed: '无法连接接口：{apiUrl}',
      requestFailedWithStatus: '请求失败（{status}）：{apiUrl} {errorText}',
      noAvailableApi: '未配置可用的聊天接口地址',
      genericRequestFailed: '请求失败，请稍后重试。',
      apiException: '接口异常：{message}',
      closePanel: '关闭聊天框',
      openPanel: '打开聊天机器人',
      generating: '正在生成回答...',
      placeholder: '请输入问题，按 Enter 发送',
      iconAlt: '聊天机器人'
    },
    campus: {
      detecting: '检测中',
      both: '北京/唐山',
      beijing: '北京',
      tangshan: '唐山',
      disconnected: '未连接'
    },
    details: {
      title: '数字人一体机详情',
      introHeading: '1、介绍',
      introText:
        '欢迎使用派中心数智专家一体机H101S。本产品专为提供高效能计算和图形处理而设计，适用于多种专业应用场景，包括数据分析、设计和多媒体处理等。具备澎湃算力、轻松定制、全面感知、灵性互动四个特点。',
      specsHeading: '2、产品规格',
      hostConfig: '主机配置',
      displaySpecs: '显示参数',
      touchSpecs: '触摸屏参数',
      otherSpecs: '其它',
      environmentSpecs: '环境参数',
      installHeading: '3、安装指南',
      unpacking: '3.1 开箱检查',
      connectionStartup: '3.2 连接与启动',
      peripheralsIntro: '派中心数智专家一体机外围接口和设备如下：',
      inspectDevice: '3.2.1 检查设备',
      powerRequirements: '3.2.2 电源要求',
      connectDevice: '3.2.3 连接设备',
      startDevice: '3.2.4 启动设备',
      image1Alt: '派中心数智专家一体机接口图1',
      image2Alt: '派中心数智专家一体机接口图2'
    },
    detailsContent: {
      memory: '内存',
      storage1: '存储1',
      storage2: '存储2',
      networkPort: '网口',
      displayInterface: '显示接口',
      otherPorts: '其它接口',
      display: '显示',
      aspectRatio: '显示比例',
      visibleArea: '可视区(长x宽)',
      bestResolution: '最佳分辨率',
      responseTime: '响应时间(典型值)',
      displayColors: '显示色彩',
      brightness: '亮度(典型值)',
      contrast: '对比度(典型值)',
      viewAngle: '可视角度(典型值)',
      touchType: '触摸屏类型',
      coverGlass: '盖板玻璃',
      lightTransmission: '触摸屏透光率',
      hardness: '表面硬度',
      touchInterface: '触摸接口',
      touchPoints: '触摸点数',
      touchResponseTime: '触摸反应时间',
      touchMethod: '触摸方法',
      camera: '相机',
      speaker: '喇叭',
      microphone: '麦克风',
      weight: '重量',
      operatingTemp: '工作温度',
      storageTemp: '存储温度',
      humidity: '湿度',
      unpacking1: '请在签收货物时检查包装是否完好。',
      unpacking2: '打开包装后，请检查设备及配件是否齐全并无损坏。',
      unpacking3:
        '包装内应包括：H1-01a 一体机、电源航插线 x1、USB-网口航插线 x1、钥匙、天线 x2、用户手册二维码、合格证、保修卡。',
      inspect1: '确认一体机及其所有配件（如电源线、接口线缆等）完好无损。',
      inspect2: '检查设备周围是否有足够的空间，确保通风良好。',
      powerText:
        '确保电源插座符合设备的电压要求，通常为 AC 220V，建议插座电流不小于 6A。',
      powerConnection: '电源连接：',
      powerConnection1: '将电源线插入设备的电源接口，另一端插入电源插座。',
      powerConnection2: '确认电源连接牢固。',
      externalConnection: '外部设备连接：',
      networkConnection: '网络连接：',
      wiredConnection: '有线连接：使用以太网线将一体机连接到路由器或网络交换机。',
      wirelessConnection: '无线连接：设备启动后，可通过内置的无线网卡连接 Wi-Fi 网络。',
      externalDisplay: '外部显示器（如需要）：',
      externalDisplay1: '使用 HDMI 线连接一体机与外部显示器。',
      inputDevices: '输入设备（如键盘、鼠标）：',
      inputDevices1: '使用 USB 接口连接键盘、鼠标或其他外设。',
      startupText:
        '按下一体机的电源按钮，启动一体机。设备启动后，屏幕会显示启动画面，随后进入数字人界面。'
    },
    detailsValues: {
      cpu: 'Xeon® Silver 4210 3代至强10核20线程',
      networkPort: '1x 千兆RJ45网口',
      otherPorts:
        '4 x USB 2.0/3.2 Gen1 ports，1 x Type-A USB 2.0 port，AC220V航插电源，带锁电源按钮',
      display: '有源矩阵式LED背光液晶显示器65英寸',
      viewAngle: '水平178°(89°/89°) 垂直178°(89°/89°)',
      touchType: '电容触摸屏（GFF）',
      coverGlass: '钢化3mm',
      touchMethod: '手指',
      speaker: 'Normal 15 Watt，Maximum 20 Watt 立体声双声道',
      microphone: '8阵列麦克风',
      weight: '285kg(含包装,木栈板)，180kg(仅设备)'
    },
    analysis: {
      loading: '正在加载并分析数据...',
      error: '错误: {message}',
      title: '问答数据分析面板',
      totalQuestions: '总问题数',
      answered: '已回答',
      unanswered: '未回答',
      unclear: '提问不清晰',
      answerRate: '回答率'
    },
    monitor: {
      server1: '服务器 1',
      server2: '服务器 2',
      title: '服务器动态监控',
      intro: '输入两台 Linux 服务器的 SSH 账号密码，连接验证成功后实时查看运行状态。',
      readError: '无法读取服务器监控信息',
      connectError: '连接服务器失败',
      daysHours: '{days}天 {hours}小时',
      hoursMinutes: '{hours}小时 {minutes}分钟',
      minutes: '{minutes}分钟',
      online: '在线',
      offline: '离线',
      cpuCores: '{count} 核',
      rootDiskTooltip: '根分区，主要存放 Ubuntu 系统文件、应用和大部分业务数据。',
      efiVarsTooltip: 'UEFI 固件变量接口目录，用于读取 BIOS/UEFI 保存的启动参数和固件变量。',
      bootEfiTooltip: 'EFI 启动分区，主要存放引导文件，通常容量很小。',
      connectedSuffix: '已连接',
      waitingInput: '未连接，等待输入信息',
      connecting: '连接中',
      pending: '待连接',
      displayName: '显示名称',
      host: 'IP 地址',
      port: '端口',
      username: '用户名',
      password: '密码',
      displayNamePlaceholder: '例如：北京服务器',
      hostPlaceholder: '例如 192.168.1.10',
      reconnect: '重新连接',
      connectAndVerify: '连接并验证',
      disconnect: '断开连接',
      emptyAfterConnect: '连接成功后将在这里显示实时监控数据。',
      noServerConnected: '此卡片尚未连接服务器',
      loadingMetrics: '正在读取监控数据...',
      noMetricsYet: '尚未获取到监控数据',
      updatedAt: '更新于 {time}',
      cpuUsage: 'CPU 使用率',
      memoryUsage: '内存使用',
      uptime: '运行时长',
      processes: '进程 {count}',
      loadAverage: '平均负载',
      cpuHardwareInfo: 'CPU 硬件信息',
      cpuModelLoading: 'CPU 型号读取中',
      packageTemperature: '封装温度',
      physicalCoresThreads: '物理核心 / 线程',
      cpuSockets: '{count} 路 CPU',
      currentFrequency: '当前频率',
      maxFrequency: '最大 {value}',
      temperature: '温度',
      fan: '风扇',
      utilization: '瞬时利用率',
      gpuMemory: '显存',
      power: '功耗',
      powerStatusTitle: '电源状态',
      powerSummaryType: 'Power Summary',
      status: '状态',
      systemPowerStatus: '系统主电源状态',
      reading: '读数',
      currentPowerReading: '当前电源读数',
      detail: '详情',
      powerDetailHint: '主电源故障 / 过载 / 控制故障',
      psuStatusTitle: 'PSU 状态',
      powerSupplyType: 'Power Supply',
      used: '已用 {value}',
      available: '可用 {value}',
      total: '总计 {value}',
      processCaption: '当前仅展示按 CPU 占用排序的前 6 个进程，进程数据不等于整机总体资源使用率。',
      processName: '进程名',
      cpuPercent: 'CPU 占用',
      memoryPercent: '内存占用比例',
      elapsedTime: '运行时长'
    },
    backToTop: {
      label: '返回顶部'
    }
  },
  'en-US': {
    common: {
      appName: 'Jiao Xiaocai',
      switchLanguage: '中',
      switchLanguageLabel: 'Switch to Chinese',
      usernameFallback: 'Account 1',
      loadingDetecting: 'Detecting',
      connected: 'Connected',
      disconnected: 'Disconnected',
      save: 'Save',
      cancel: 'Cancel',
      add: 'Add',
      close: 'Close',
      download: 'Download',
      edit: 'Edit',
      delete: 'Delete',
      back: 'Back',
      send: 'Send'
    },
    login: {
      title: 'User Login',
      username: 'Username',
      password: 'Password',
      submit: 'Log In',
      invalidCredentials: 'Incorrect username or password',
      showPassword: 'Show password',
      hidePassword: 'Hide password'
    },
    topNav: {
      tangshanLogs: 'Tangshan Chat Logs',
      beijingLogs: 'Beijing Chat Logs',
      details: 'Digital Human Details',
      logoAlt: 'Jiao Xiaocai'
    },
    account: {
      accountManagement: 'Account',
      settings: 'Settings',
      logout: 'Log Out',
      accountManagementTodo: 'Account management is not implemented yet.',
      settingsTodo: 'Settings are not implemented yet.'
    },
    sidebar: {
      title: 'Device List',
      addDevice: 'Add Device',
      editDevice: 'Edit Device',
      addDeviceDialog: 'Add Device',
      deviceName: 'Device Name',
      type: 'Type',
      linkType: 'Web Link',
      downloadType: 'Desktop Monitor (Download Required)',
      link: 'Link',
      linkRequired: 'A link is required for link devices',
      linkOptional: 'Optional. Leave blank to use the default download page',
      remoteTitle: 'Use Sunlogin Client for Remote Control',
      remoteDesc1:
        'If Sunlogin Client is not installed, please download and install it first.',
      remoteDesc2:
        'After installation, use the Sunlogin Client directly for remote control.',
      siteMonitor: 'Site Monitor',
      desktopMonitor: 'Desktop Monitor (Sunlogin)',
      missingLink: 'No link configured',
      confirmDelete: 'Delete this device?',
      enterDeviceName: 'Please enter a device name',
      enterDeviceLink: 'Please enter a device link'
    },
    chatLogs: {
      title: 'Tailscale Connection',
      intro:
        'Confirm Tailscale network connectivity first, then dynamically connect to the two Linux servers below.',
      tangshan: 'Tangshan Digital Human',
      beijing: 'Beijing Digital Human',
      fetchFailed: 'Unable to fetch Tailscale status',
      statusLine: '{label}: {status}'
    },
    chatbot: {
      initialMessage: 'Hello, I am Jiao Xiaocai. Please enter your question.',
      emptyReply: 'The request succeeded, but no displayable content was returned.',
      fixedIntroReply:
        'My name is Jiao Xiaocai. I am a digital human jointly developed by Lenovo Group and Beijing Jiaotong University. I answer questions based on the knowledge base. Feel free to ask me anything.',
      timeout: 'Request timed out: {apiUrl}',
      mixedContent:
        'The browser blocked an insecure request: the current page uses HTTPS, but the chat API uses HTTP ({apiUrl})',
      connectFailed: 'Unable to connect to API: {apiUrl}',
      requestFailedWithStatus: 'Request failed ({status}): {apiUrl} {errorText}',
      noAvailableApi: 'No available chat API is configured',
      genericRequestFailed: 'Request failed. Please try again later.',
      apiException: 'API error: {message}',
      closePanel: 'Close chat panel',
      openPanel: 'Open chat assistant',
      generating: 'Generating response...',
      placeholder: 'Enter your question and press Enter to send',
      iconAlt: 'Chat assistant'
    },
    campus: {
      detecting: 'Detecting',
      both: 'Beijing / Tangshan',
      beijing: 'Beijing',
      tangshan: 'Tangshan',
      disconnected: 'Disconnected'
    },
    details: {
      title: 'Digital Human Integrated Unit Details',
      introHeading: '1. Overview',
      introText:
        'Welcome to the Pai Center Intelligent Expert Integrated Unit H101S. This product is designed for high-performance computing and graphics processing, and is suitable for professional scenarios such as data analysis, design, and multimedia processing. It features powerful computing, easy customization, comprehensive perception, and interactive intelligence.',
      specsHeading: '2. Specifications',
      hostConfig: 'Host Configuration',
      displaySpecs: 'Display Specifications',
      touchSpecs: 'Touch Specifications',
      otherSpecs: 'Other',
      environmentSpecs: 'Environmental Specifications',
      installHeading: '3. Installation Guide',
      unpacking: '3.1 Unpacking Inspection',
      connectionStartup: '3.2 Connection and Startup',
      peripheralsIntro:
        'The external interfaces and devices of the integrated unit are shown below:',
      inspectDevice: '3.2.1 Inspect the Device',
      powerRequirements: '3.2.2 Power Requirements',
      connectDevice: '3.2.3 Connect the Device',
      startDevice: '3.2.4 Start the Device',
      image1Alt: 'Integrated unit interface diagram 1',
      image2Alt: 'Integrated unit interface diagram 2'
    },
    detailsContent: {
      memory: 'Memory',
      storage1: 'Storage 1',
      storage2: 'Storage 2',
      networkPort: 'Network Port',
      displayInterface: 'Display Interface',
      otherPorts: 'Other Ports',
      display: 'Display',
      aspectRatio: 'Aspect Ratio',
      visibleArea: 'Visible Area (W x H)',
      bestResolution: 'Optimal Resolution',
      responseTime: 'Response Time (Typical)',
      displayColors: 'Display Colors',
      brightness: 'Brightness (Typical)',
      contrast: 'Contrast Ratio (Typical)',
      viewAngle: 'Viewing Angle (Typical)',
      touchType: 'Touch Panel Type',
      coverGlass: 'Cover Glass',
      lightTransmission: 'Light Transmission',
      hardness: 'Surface Hardness',
      touchInterface: 'Touch Interface',
      touchPoints: 'Touch Points',
      touchResponseTime: 'Touch Response Time',
      touchMethod: 'Touch Method',
      camera: 'Camera',
      speaker: 'Speaker',
      microphone: 'Microphone',
      weight: 'Weight',
      operatingTemp: 'Operating Temperature',
      storageTemp: 'Storage Temperature',
      humidity: 'Humidity',
      unpacking1:
        'Inspect the packaging upon delivery to ensure it is intact.',
      unpacking2:
        'After opening the package, confirm that the device and accessories are complete and undamaged.',
      unpacking3:
        'The package should include: H1-01a integrated unit, power aviation plug cable x1, USB-to-network aviation plug cable x1, keys, antennas x2, user manual QR code, certificate of conformity, and warranty card.',
      inspect1:
        'Confirm that the integrated unit and all accessories, such as power cables and interface cables, are intact.',
      inspect2:
        'Check that there is enough surrounding space to ensure good ventilation.',
      powerText:
        'Ensure that the power outlet meets the voltage requirement, typically AC 220V, and that the current rating is no less than 6A.',
      powerConnection: 'Power connection:',
      powerConnection1:
        'Plug the power cable into the device power port and the other end into the power outlet.',
      powerConnection2: 'Make sure the power connection is secure.',
      externalConnection: 'External device connection:',
      networkConnection: 'Network connection:',
      wiredConnection:
        'Wired: connect the integrated unit to a router or network switch using an Ethernet cable.',
      wirelessConnection:
        'Wireless: after startup, connect to a Wi-Fi network through the built-in wireless card.',
      externalDisplay: 'External monitor (if needed):',
      externalDisplay1:
        'Use an HDMI cable to connect the integrated unit to an external monitor.',
      inputDevices: 'Input devices (such as keyboard and mouse):',
      inputDevices1:
        'Connect a keyboard, mouse, or other peripherals through the USB ports.',
      startupText:
        'Press the power button on the integrated unit to start it. After startup, the screen will display the boot screen and then enter the digital human interface.'
    },
    detailsValues: {
      cpu: 'Xeon® Silver 4210, 3rd-generation Xeon, 10 cores / 20 threads',
      networkPort: '1x Gigabit RJ45 Ethernet port',
      otherPorts:
        '4 x USB 2.0/3.2 Gen1 ports, 1 x Type-A USB 2.0 port, AC220V aviation plug power connector, lockable power button',
      display: '65-inch active-matrix LED-backlit LCD display',
      viewAngle: 'Horizontal 178° (89°/89°), vertical 178° (89°/89°)',
      touchType: 'Capacitive touchscreen (GFF)',
      coverGlass: '3 mm tempered glass',
      touchMethod: 'Finger',
      speaker: 'Normal 15 Watt, maximum 20 Watt stereo dual-channel speakers',
      microphone: '8-microphone array',
      weight: '285 kg with packaging and wooden pallet, 180 kg device only'
    },
    analysis: {
      loading: 'Loading and analyzing data...',
      error: 'Error: {message}',
      title: 'Q&A Analytics Dashboard',
      totalQuestions: 'Total Questions',
      answered: 'Answered',
      unanswered: 'Unanswered',
      unclear: 'Unclear Questions',
      answerRate: 'Answer Rate'
    },
    monitor: {
      server1: 'Server 1',
      server2: 'Server 2',
      title: 'Dynamic Server Monitor',
      intro: 'Enter the SSH credentials for two Linux servers and view live runtime metrics after a successful connection check.',
      readError: 'Unable to read server monitoring data',
      connectError: 'Failed to connect to the server',
      daysHours: '{days}d {hours}h',
      hoursMinutes: '{hours}h {minutes}m',
      minutes: '{minutes}m',
      online: 'Online',
      offline: 'Offline',
      cpuCores: '{count} cores',
      rootDiskTooltip: 'Root partition storing Ubuntu system files, applications, and most business data.',
      efiVarsTooltip: 'UEFI firmware variable interface used to read BIOS/UEFI boot parameters and firmware variables.',
      bootEfiTooltip: 'EFI boot partition mainly storing boot files, usually with very small capacity.',
      connectedSuffix: 'Connected',
      waitingInput: 'Disconnected, waiting for connection details',
      connecting: 'Connecting',
      pending: 'Pending',
      displayName: 'Display Name',
      host: 'IP Address',
      port: 'Port',
      username: 'Username',
      password: 'Password',
      displayNamePlaceholder: 'e.g. Beijing server',
      hostPlaceholder: 'e.g. 192.168.1.10',
      reconnect: 'Reconnect',
      connectAndVerify: 'Connect and Verify',
      disconnect: 'Disconnect',
      emptyAfterConnect: 'Live monitoring data will appear here after a successful connection.',
      noServerConnected: 'This card is not connected to a server yet',
      loadingMetrics: 'Loading monitoring data...',
      noMetricsYet: 'Monitoring data is not available yet',
      updatedAt: 'Updated at {time}',
      cpuUsage: 'CPU Usage',
      memoryUsage: 'Memory Usage',
      uptime: 'Uptime',
      processes: 'Processes {count}',
      loadAverage: 'Load Average',
      cpuHardwareInfo: 'CPU Hardware Info',
      cpuModelLoading: 'Reading CPU model',
      packageTemperature: 'Package Temp',
      physicalCoresThreads: 'Physical Cores / Threads',
      cpuSockets: '{count} CPU sockets',
      currentFrequency: 'Current Frequency',
      maxFrequency: 'Max {value}',
      temperature: 'Temperature',
      fan: 'Fan',
      utilization: 'Utilization',
      gpuMemory: 'GPU Memory',
      power: 'Power',
      powerStatusTitle: 'Power Status',
      powerSummaryType: 'Power Summary',
      status: 'Status',
      systemPowerStatus: 'System main power status',
      reading: 'Reading',
      currentPowerReading: 'Current power reading',
      detail: 'Detail',
      powerDetailHint: 'Main power fault / overload / control fault',
      psuStatusTitle: 'PSU Status',
      powerSupplyType: 'Power Supply',
      used: 'Used {value}',
      available: 'Available {value}',
      total: 'Total {value}',
      processCaption: 'Only the top 6 processes sorted by CPU usage are shown here. Process-level data is not equal to total host resource usage.',
      processName: 'Process',
      cpuPercent: 'CPU',
      memoryPercent: 'Memory',
      elapsedTime: 'Elapsed'
    },
    backToTop: {
      label: 'Back to top'
    }
  }
};

const getValue = (tree: TranslationNode, key: string): string | TranslationNode | undefined => {
  return key.split('.').reduce<string | TranslationNode | undefined>((current, part) => {
    if (!current || typeof current === 'string') return current;
    return current[part];
  }, tree);
};

export const translate = (
  language: Language,
  key: string,
  params?: Record<string, string | number>
): string => {
  const current = getValue(messages[language], key);
  const fallback = getValue(messages['zh-CN'], key);
  const value =
    typeof current === 'string' ? current : typeof fallback === 'string' ? fallback : key;
  return interpolate(value, params);
};
