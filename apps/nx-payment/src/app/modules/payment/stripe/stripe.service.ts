import {BadRequestException, Injectable, InternalServerErrorException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import Stripe from 'stripe';

enum StripeError {
  InvalidRequest = 'StripeInvalidRequestError'
}

@Injectable()
export default class StripeService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService
  ) {
    this.stripe = new Stripe(configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2022-11-15',
    });
  }

  public async createCustomer(name: string, email: string) {
    return this.stripe.customers.create({
      name,
      email
    });
  }

  public async charge(amount: number, paymentMethodId: string, customerId: string) {
    return this.stripe.paymentIntents.create({
      amount,
      customer: customerId,
      payment_method: paymentMethodId,
      currency: this.configService.get('STRIPE_CURRENCY'),
      confirm: true
    })
  }

  public async attachCreditCard(paymentMethodId: string, customerId: string) {
    return this.stripe.setupIntents.create({
      customer: customerId,
      payment_method: paymentMethodId,
    })
  }


  public async listCreditCards(customerId: string) {
    return this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
  }

  public async setDefaultCreditCard(paymentMethodId: string, customerId: string) {
    try {
      return await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      })
    } catch (error) {
      if (error?.type === StripeError.InvalidRequest) {
        throw new BadRequestException('Wrong credit card chosen');
      }
      throw new InternalServerErrorException();
    }
  }
}
