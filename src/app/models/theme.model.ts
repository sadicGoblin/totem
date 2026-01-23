export interface ThemeConfig {
  global: GlobalTheme;
  welcome: WelcomeTheme;
  home: HomeTheme;
  productModal: ProductModalTheme;
  cartFloating: CartFloatingTheme;
  checkout: CheckoutTheme;
  payment: PaymentTheme;
  confirmModal: ConfirmModalTheme;
}

export interface GlobalTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    light: string;
    white: string;
    dark: string;
    gray: {
      light: string;
      medium: string;
      dark: string;
    };
    status: {
      success: string;
      error: string;
      warning: string;
    };
  };
  fonts: {
    family: string;
    sizes: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
      xxxl: string;
    };
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    round: string;
    pill: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

export interface ButtonTheme {
  backgroundColor?: string;
  background?: string;
  textColor?: string;
  fontSize?: string;
  fontWeight?: string;
  padding?: string;
  borderRadius?: string;
  borderColor?: string;
  hoverBackground?: string;
  height?: string;
  minWidth?: string;
  size?: string;
}

export interface TextTheme {
  color?: string;
  fontSize?: string;
  fontWeight?: string;
}

export interface WelcomeTheme {
  container: {
    background: string;
  };
  overlay: {
    backgroundColor: string;
  };
  content: {
    backgroundColor: string;
    borderRadius: string;
    padding: string;
  };
  logo: {
    width: string;
    height: string;
  };
  title: TextTheme;
  subtitle: TextTheme;
  description: TextTheme;
  startButton: ButtonTheme;
}

export interface HomeTheme {
  header: {
    background: string;
    padding: string;
    logo: {
      height: string;
    };
  };
  promoSlides: {
    height: string;
    backgroundColor: string;
    slideButton: ButtonTheme;
    indicators: {
      activeColor: string;
      inactiveColor: string;
      size: string;
    };
  };
  sidebar: {
    width: string;
    backgroundColor: string;
    borderColor: string;
    title: TextTheme;
    categoryItem: {
      activeBackground: string;
      activeBorderColor: string;
      activeTextColor: string;
      iconSize: string;
      iconBorderRadius: string;
      nameSize: string;
    };
  };
  productsMain: {
    backgroundColor: string;
    padding: string;
    sectionHeader: {
      titleColor: string;
      titleSize: string;
      borderColor: string;
      countColor: string;
    };
  };
  productCard: {
    backgroundColor: string;
    borderRadius: string;
    borderColor: string;
    imageHeight: string;
    specialTag: {
      backgroundColor: string;
      textColor: string;
      fontSize: string;
    };
    discountTag: {
      backgroundColor: string;
      textColor: string;
      fontSize: string;
    };
    name: TextTheme;
    description: TextTheme;
    price: {
      currentColor: string;
      currentSize: string;
      originalColor: string;
      originalSize: string;
    };
    addToCartButton: ButtonTheme;
    quantityControls: {
      backgroundColor: string;
      textColor: string;
      decreaseColor: string;
      increaseColor: string;
      fontSize: string;
    };
  };
}

export interface ProductModalTheme {
  backdrop: {
    backgroundColor: string;
  };
  container: {
    backgroundColor: string;
    borderRadius: string;
    maxWidth: string;
  };
  closeButton: {
    backgroundColor: string;
    iconColor: string;
    size: string;
  };
  specialTag: {
    backgroundColor: string;
    textColor: string;
  };
  discountTag: {
    backgroundColor: string;
    textColor: string;
  };
  productName: TextTheme;
  description: TextTheme;
  price: {
    currentColor: string;
    currentSize: string;
    discountedColor: string;
  };
  quantityControls: {
    buttonBorderColor: string;
    buttonSize: string;
    fontSize: string;
  };
  quantityText: TextTheme;
  actionButton: ButtonTheme;
}

export interface CartFloatingTheme {
  button: {
    background: string;
    textColor: string;
    borderColor: string;
    borderRadius: string;
    minWidth: string;
    height: string;
    position: {
      bottom: string;
      right: string;
    };
    cartText: TextTheme;
    cartCount: {
      background: string;
      textColor: string;
      size: string;
      fontSize: string;
    };
    cartAmount: TextTheme;
  };
  sidebar: {
    width: string;
    backgroundColor: string;
    header: {
      height: string;
      background: string;
      textColor: string;
      titleSize: string;
      closeButtonSize: string;
    };
    clearCartButton: ButtonTheme;
    cartItem: {
      borderColor: string;
      deleteButton: {
        background: string;
        textColor: string;
        size: string;
      };
      imageSize: string;
      name: TextTheme;
      price: TextTheme;
      quantityButton: {
        size: string;
        borderColor: string;
        textColor: string;
        fontSize: string;
      };
      total: TextTheme;
    };
    emptyState: {
      messageColor: string;
      messageSize: string;
      continueButton: ButtonTheme;
    };
    footer: {
      backgroundColor: string;
      height: string;
      totalRow: TextTheme;
      checkoutButton: ButtonTheme;
    };
  };
}

export interface CheckoutTheme {
  container: {
    background: string;
  };
  header: {
    height: string;
    background: string;
    titleColor: string;
    titleSize: string;
    logo: {
      height: string;
    };
    backButton: ButtonTheme;
  };
  cartItems: {
    backgroundColor: string;
    borderRadius: string;
    borderColor: string;
    clearButton: ButtonTheme;
    item: {
      borderColor: string;
      deleteButton: {
        background: string;
        size: string;
      };
      imageSize: string;
      name: TextTheme;
      price: TextTheme;
      quantityButton: {
        size: string;
        borderColor: string;
        fontSize: string;
      };
      total: TextTheme;
    };
    emptyState: {
      messageColor: string;
      messageSize: string;
      continueButton: ButtonTheme;
    };
  };
  orderSummary: {
    background: string;
    borderTopColor: string;
    totalLabel: TextTheme;
    totalAmount: TextTheme;
    completeButton: ButtonTheme;
  };
}

export interface PaymentTheme {
  container: {
    background: string;
  };
  header: {
    height: string;
    background: string;
    titleColor: string;
    titleSize: string;
    backButton: ButtonTheme;
  };
  methodCard: {
    backgroundColor: string;
    borderRadius: string;
    height: string;
    borderColor: string;
    hoverBorderColor: string;
    iconSize: string;
    iconColor: string;
    nameColor: string;
    nameSize: string;
  };
  processing: {
    background: string;
    content: {
      backgroundColor: string;
      borderColor: string;
      borderRadius: string;
    };
    icon: {
      background: string;
      size: string;
      iconColor: string;
    };
    title: TextTheme;
    message: TextTheme;
    loader: {
      backgroundColor: string;
      barGradient: string;
    };
    cancelButton: ButtonTheme;
  };
  voucherPrinting: {
    content: {
      backgroundColor: string;
      borderColor: string;
    };
    icon: {
      background: string;
    };
    successIcon: {
      background: string;
    };
    title: TextTheme;
    printingMessage: TextTheme;
    orderDetails: {
      backgroundColor: string;
      orderNumberColor: string;
      totalColor: string;
    };
    confirmButton: ButtonTheme;
  };
}

export interface ConfirmModalTheme {
  backdrop: {
    backgroundColor: string;
  };
  container: {
    backgroundColor: string;
    borderRadius: string;
    maxWidth: string;
  };
  title: TextTheme;
  message: TextTheme;
  buttons: {
    confirm: {
      dangerBackground: string;
      primaryBackground: string;
      textColor: string;
    };
    cancel: {
      backgroundColor: string;
      textColor: string;
    };
  };
}
